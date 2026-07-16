<?php

namespace Database\Seeders;

use App\Models\BlockchainConfig;
use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);

        // Create demo user
        User::create([
            'name' => 'Demo User',
            'email' => 'demo@example.com',
            'password' => Hash::make('password'),
            'is_admin' => false,
            'email_verified_at' => now(),
        ]);

        // Create blockchain configs
        BlockchainConfig::create([
            'chain_id' => '1',
            'name' => 'Ethereum',
            'symbol' => 'ETH',
            'rpc_url' => 'https://eth.llamarpc.com',
            'explorer_url' => 'https://etherscan.io',
            'payment_token_address' => '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            'payment_token_symbol' => 'USDT',
            'payment_token_decimals' => 6,
            'is_active' => true,
            'is_testnet' => false,
        ]);

        BlockchainConfig::create([
            'chain_id' => '56',
            'name' => 'BNB Chain',
            'symbol' => 'BNB',
            'rpc_url' => 'https://bsc-dataseed.binance.org',
            'explorer_url' => 'https://bscscan.com',
            'payment_token_address' => '0x55d398326f99059fF775485246999027B3197955',
            'payment_token_symbol' => 'USDT',
            'payment_token_decimals' => 18,
            'is_active' => true,
            'is_testnet' => false,
        ]);

        BlockchainConfig::create([
            'chain_id' => '11155111',
            'name' => 'Sepolia',
            'symbol' => 'ETH',
            'rpc_url' => 'https://rpc.sepolia.org',
            'explorer_url' => 'https://sepolia.etherscan.io',
            'payment_token_symbol' => 'USDT',
            'payment_token_decimals' => 18,
            'is_active' => true,
            'is_testnet' => true,
        ]);

        BlockchainConfig::create([
            'chain_id' => '97',
            'name' => 'BSC Testnet',
            'symbol' => 'tBNB',
            'rpc_url' => 'https://data-seed-prebsc-1-s1.binance.org:8545',
            'explorer_url' => 'https://testnet.bscscan.com',
            'payment_token_symbol' => 'USDT',
            'payment_token_decimals' => 18,
            'is_active' => true,
            'is_testnet' => true,
        ]);

        // Create sample properties
        $properties = [
            [
                'name' => 'Luxury Beachfront Villa',
                'slug' => 'luxury-beachfront-villa',
                'description' => "Experience the ultimate in coastal living with this stunning beachfront villa. This exclusive property offers breathtaking ocean views, private beach access, and world-class amenities.\n\nThe villa features an open-concept design with floor-to-ceiling windows that flood the space with natural light. The gourmet kitchen is equipped with top-of-the-line appliances, and the master suite includes a spa-like bathroom and private balcony.\n\nInvestors will benefit from high rental demand in this prime location, with consistent bookings throughout the year from vacation rentals and long-term tenants.",
                'short_description' => 'Stunning beachfront villa with private beach access and premium amenities.',
                'location' => 'Miami Beach, Florida',
                'address' => '1234 Ocean Drive, Miami Beach, FL 33139',
                'city' => 'Miami Beach',
                'country' => 'USA',
                'property_type' => 'residential',
                'total_value' => 2500000,
                'token_price' => 100,
                'total_tokens' => 25000,
                'available_tokens' => 18500,
                'sold_tokens' => 6500,
                'expected_roi' => 12.5,
                'rental_yield' => 8.2,
                'min_investment' => 100,
                'amenities' => ['Private Beach', 'Pool', 'Gym', 'Spa', 'Smart Home', 'Security'],
                'features' => ['Ocean View', '6 Bedrooms', '7 Bathrooms', 'Wine Cellar', 'Home Theater'],
                'status' => 'active',
                'blockchain' => 'bsc',
                'property_size' => 8500,
                'bedrooms' => 6,
                'bathrooms' => 7,
                'year_built' => 2021,
                'is_featured' => true,
            ],
            [
                'name' => 'Downtown Commercial Tower',
                'slug' => 'downtown-commercial-tower',
                'description' => "Prime commercial real estate opportunity in the heart of the financial district. This Class A office building features modern amenities and is home to several Fortune 500 companies.\n\nThe property boasts high occupancy rates and long-term lease agreements, providing stable and predictable income for investors. Recent renovations have upgraded all building systems to the latest energy-efficient standards.\n\nStrategically located near public transportation, restaurants, and amenities, this building attracts top-tier tenants willing to pay premium rents.",
                'short_description' => 'Class A office building with Fortune 500 tenants and stable income.',
                'location' => 'Manhattan, New York',
                'address' => '500 Park Avenue, New York, NY 10022',
                'city' => 'New York',
                'country' => 'USA',
                'property_type' => 'commercial',
                'total_value' => 50000000,
                'token_price' => 500,
                'total_tokens' => 100000,
                'available_tokens' => 75000,
                'sold_tokens' => 25000,
                'expected_roi' => 9.8,
                'rental_yield' => 6.5,
                'min_investment' => 500,
                'amenities' => ['Fitness Center', 'Conference Rooms', 'Rooftop Terrace', '24/7 Security', 'Parking'],
                'features' => ['LEED Certified', '45 Floors', '500,000 sqft', 'Modern Elevators', 'Green Building'],
                'status' => 'active',
                'blockchain' => 'ethereum',
                'property_size' => 500000,
                'property_size_unit' => 'sqft',
                'year_built' => 2018,
                'is_featured' => true,
            ],
            [
                'name' => 'Tropical Resort Complex',
                'slug' => 'tropical-resort-complex',
                'description' => "Invest in paradise with this world-class tropical resort. Located on a pristine island, this resort offers 200 luxury rooms, multiple restaurants, and extensive recreational facilities.\n\nThe resort has won numerous travel awards and maintains exceptional occupancy rates year-round. Revenue streams include room bookings, spa services, dining, and exclusive experiences.\n\nThis is a rare opportunity to own a stake in a premium hospitality asset with strong growth potential in the luxury travel market.",
                'short_description' => 'Award-winning tropical resort with 200 luxury rooms and premium amenities.',
                'location' => 'Bali, Indonesia',
                'address' => 'Jl. Raya Uluwatu, Pecatu, Bali 80361',
                'city' => 'Bali',
                'country' => 'Indonesia',
                'property_type' => 'commercial',
                'total_value' => 35000000,
                'token_price' => 250,
                'total_tokens' => 140000,
                'available_tokens' => 140000,
                'sold_tokens' => 0,
                'expected_roi' => 15.0,
                'rental_yield' => 10.5,
                'min_investment' => 250,
                'amenities' => ['Infinity Pool', 'Spa', 'Beach Club', 'Restaurants', 'Water Sports', 'Yoga Studio'],
                'features' => ['200 Rooms', 'Private Beach', 'Award Winning', 'Eco-Friendly', 'Butler Service'],
                'status' => 'upcoming',
                'blockchain' => 'bsc',
                'property_size' => 50,
                'property_size_unit' => 'acres',
                'year_built' => 2019,
                'is_featured' => true,
            ],
            [
                'name' => 'Urban Apartment Complex',
                'slug' => 'urban-apartment-complex',
                'description' => "Modern apartment complex in a rapidly growing urban area. This property features 150 units ranging from studios to 3-bedroom apartments, all with high-end finishes and smart home technology.\n\nThe complex offers resort-style amenities including a rooftop pool, fitness center, co-working space, and pet park. Located near major employers and universities, the property maintains near-full occupancy.\n\nIdeal for investors seeking stable rental income with potential for appreciation as the neighborhood continues to develop.",
                'short_description' => 'Modern 150-unit apartment complex with resort-style amenities.',
                'location' => 'Austin, Texas',
                'address' => '2000 East 6th Street, Austin, TX 78702',
                'city' => 'Austin',
                'country' => 'USA',
                'property_type' => 'residential',
                'total_value' => 45000000,
                'token_price' => 150,
                'total_tokens' => 300000,
                'available_tokens' => 220000,
                'sold_tokens' => 80000,
                'expected_roi' => 11.2,
                'rental_yield' => 7.8,
                'min_investment' => 150,
                'amenities' => ['Rooftop Pool', 'Gym', 'Co-working', 'Pet Park', 'Package Room', 'EV Charging'],
                'features' => ['150 Units', 'Smart Home', 'Concierge', 'Bike Storage', 'Covered Parking'],
                'status' => 'active',
                'blockchain' => 'bsc',
                'property_size' => 180000,
                'year_built' => 2022,
                'is_featured' => false,
            ],
            [
                'name' => 'Industrial Warehouse Hub',
                'slug' => 'industrial-warehouse-hub',
                'description' => "Strategic logistics hub positioned near major highways and the international airport. This state-of-the-art warehouse facility is ideal for e-commerce fulfillment and distribution operations.\n\nThe property features 500,000 square feet of warehouse space with 36-foot clear heights, modern loading docks, and climate-controlled sections. Currently leased to multiple blue-chip tenants on long-term agreements.\n\nWith e-commerce growth driving demand for logistics real estate, this property offers both income stability and appreciation potential.",
                'short_description' => 'State-of-the-art logistics hub with major tenant leases.',
                'location' => 'Dallas, Texas',
                'address' => '1500 Logistics Parkway, Dallas, TX 75261',
                'city' => 'Dallas',
                'country' => 'USA',
                'property_type' => 'industrial',
                'total_value' => 28000000,
                'token_price' => 200,
                'total_tokens' => 140000,
                'available_tokens' => 0,
                'sold_tokens' => 140000,
                'expected_roi' => 10.5,
                'rental_yield' => 7.2,
                'min_investment' => 200,
                'amenities' => ['Loading Docks', 'Climate Control', 'Security', 'Truck Parking', 'Office Space'],
                'features' => ['500,000 sqft', '36ft Clear Height', 'Cross-Dock', 'Rail Access', 'Solar Panels'],
                'status' => 'sold_out',
                'blockchain' => 'ethereum',
                'property_size' => 500000,
                'year_built' => 2020,
                'is_featured' => false,
            ],
        ];

        foreach ($properties as $property) {
            Property::create($property);
        }
    }
}
