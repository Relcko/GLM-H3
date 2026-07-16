// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RWAProperty
 * @dev ERC1155 contract for Real World Asset (RWA) property tokenization
 * Each token ID represents a different property, and token amounts represent fractional ownership
 */
contract RWAProperty is ERC1155, ERC1155Burnable, ERC1155Supply, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    string public name = "RWA Property Tokens";
    string public symbol = "RWAP";

    // Payment token (USDT, USDC, etc.)
    IERC20 public paymentToken;

    // Property structure
    struct Property {
        uint256 id;
        string uri;
        uint256 totalSupply;
        uint256 availableSupply;
        uint256 pricePerToken; // Price in payment token (with decimals)
        bool isActive;
        bool exists;
    }

    // Mapping from property ID to Property struct
    mapping(uint256 => Property) public properties;

    // Property counter
    uint256 public propertyCount;

    // Treasury address for receiving payments
    address public treasury;

    // Mapping to track property URIs
    mapping(uint256 => string) private _tokenURIs;

    // Events
    event PropertyCreated(
        uint256 indexed propertyId,
        uint256 totalSupply,
        uint256 pricePerToken,
        string uri
    );
    event PropertyUpdated(uint256 indexed propertyId, uint256 pricePerToken, bool isActive);
    event TokensPurchased(
        uint256 indexed propertyId,
        address indexed buyer,
        uint256 amount,
        uint256 totalCost
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PaymentTokenUpdated(address indexed oldToken, address indexed newToken);
    event TokensMinted(uint256 indexed propertyId, address indexed to, uint256 amount);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    constructor(
        address _paymentToken,
        address _treasury
    ) ERC1155("") Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_treasury != address(0), "Invalid treasury");
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
    }

    /**
     * @dev Create a new property token
     * @param _totalSupply Total number of tokens for this property
     * @param _pricePerToken Price per token in payment token
     * @param _uri Metadata URI for this property
     */
    function createProperty(
        uint256 _totalSupply,
        uint256 _pricePerToken,
        string memory _uri
    ) external onlyOwner returns (uint256) {
        require(_totalSupply > 0, "Supply must be > 0");
        require(_pricePerToken > 0, "Price must be > 0");

        propertyCount++;
        uint256 propertyId = propertyCount;

        properties[propertyId] = Property({
            id: propertyId,
            uri: _uri,
            totalSupply: _totalSupply,
            availableSupply: _totalSupply,
            pricePerToken: _pricePerToken,
            isActive: true,
            exists: true
        });

        _tokenURIs[propertyId] = _uri;

        emit PropertyCreated(propertyId, _totalSupply, _pricePerToken, _uri);

        return propertyId;
    }

    /**
     * @dev Purchase tokens for a property
     * @param _propertyId ID of the property
     * @param _amount Number of tokens to purchase
     */
    function purchaseTokens(
        uint256 _propertyId,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        Property storage property = properties[_propertyId];

        require(property.exists, "Property does not exist");
        require(property.isActive, "Property not active");
        require(_amount > 0, "Amount must be > 0");
        require(_amount <= property.availableSupply, "Insufficient supply");

        uint256 totalCost = _amount * property.pricePerToken;

        // Transfer payment from buyer to treasury
        paymentToken.safeTransferFrom(msg.sender, treasury, totalCost);

        // Update available supply
        property.availableSupply -= _amount;

        // Mint tokens to buyer
        _mint(msg.sender, _propertyId, _amount, "");

        emit TokensPurchased(_propertyId, msg.sender, _amount, totalCost);
    }

    /**
     * @dev Admin mint tokens (for airdrops, corrections, etc.)
     * @param _propertyId ID of the property
     * @param _to Address to mint tokens to
     * @param _amount Number of tokens to mint
     */
    function adminMint(
        uint256 _propertyId,
        address _to,
        uint256 _amount
    ) external onlyOwner {
        Property storage property = properties[_propertyId];

        require(property.exists, "Property does not exist");
        require(_amount > 0, "Amount must be > 0");
        require(_amount <= property.availableSupply, "Insufficient supply");
        require(_to != address(0), "Invalid address");

        property.availableSupply -= _amount;
        _mint(_to, _propertyId, _amount, "");

        emit TokensMinted(_propertyId, _to, _amount);
    }

    /**
     * @dev Update property details
     * @param _propertyId ID of the property
     * @param _pricePerToken New price per token
     * @param _isActive Whether the property is active for sale
     */
    function updateProperty(
        uint256 _propertyId,
        uint256 _pricePerToken,
        bool _isActive
    ) external onlyOwner {
        Property storage property = properties[_propertyId];
        require(property.exists, "Property does not exist");

        if (_pricePerToken > 0) {
            property.pricePerToken = _pricePerToken;
        }
        property.isActive = _isActive;

        emit PropertyUpdated(_propertyId, property.pricePerToken, _isActive);
    }

    /**
     * @dev Update property URI
     * @param _propertyId ID of the property
     * @param _uri New metadata URI
     */
    function setPropertyURI(uint256 _propertyId, string memory _uri) external onlyOwner {
        require(properties[_propertyId].exists, "Property does not exist");
        _tokenURIs[_propertyId] = _uri;
        properties[_propertyId].uri = _uri;
    }

    /**
     * @dev Get URI for a token
     */
    function uri(uint256 _tokenId) public view override returns (string memory) {
        require(properties[_tokenId].exists, "Property does not exist");
        return _tokenURIs[_tokenId];
    }

    /**
     * @dev Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @dev Update payment token
     */
    function setPaymentToken(address _paymentToken) external onlyOwner {
        require(_paymentToken != address(0), "Invalid token");
        address oldToken = address(paymentToken);
        paymentToken = IERC20(_paymentToken);
        emit PaymentTokenUpdated(oldToken, _paymentToken);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw tokens (in case of stuck tokens)
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
        emit EmergencyWithdraw(_token, _amount);
    }

    /**
     * @dev Get property details
     */
    function getProperty(uint256 _propertyId) external view returns (
        uint256 id,
        string memory propertyUri,
        uint256 totalSupply,
        uint256 availableSupply,
        uint256 pricePerToken,
        bool isActive,
        bool exists
    ) {
        Property memory property = properties[_propertyId];
        return (
            property.id,
            property.uri,
            property.totalSupply,
            property.availableSupply,
            property.pricePerToken,
            property.isActive,
            property.exists
        );
    }

    /**
     * @dev Calculate cost for purchasing tokens
     */
    function calculateCost(uint256 _propertyId, uint256 _amount) external view returns (uint256) {
        require(properties[_propertyId].exists, "Property does not exist");
        return _amount * properties[_propertyId].pricePerToken;
    }

    /**
     * @dev Check if user can purchase tokens
     */
    function canPurchase(
        uint256 _propertyId,
        address _buyer,
        uint256 _amount
    ) external view returns (bool, string memory) {
        Property memory property = properties[_propertyId];

        if (!property.exists) return (false, "Property does not exist");
        if (!property.isActive) return (false, "Property not active");
        if (_amount == 0) return (false, "Amount must be > 0");
        if (_amount > property.availableSupply) return (false, "Insufficient supply");

        uint256 totalCost = _amount * property.pricePerToken;
        uint256 buyerBalance = paymentToken.balanceOf(_buyer);
        uint256 buyerAllowance = paymentToken.allowance(_buyer, address(this));

        if (buyerBalance < totalCost) return (false, "Insufficient balance");
        if (buyerAllowance < totalCost) return (false, "Insufficient allowance");

        return (true, "");
    }

    // Required overrides
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
