export interface User {
    id: number;
    name: string;
    email: string;
    wallet_address?: string;
    email_verified_at?: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
}

export interface Property {
    id: number;
    name: string;
    slug: string;
    description: string;
    location: string;
    address: string;
    city?: string;
    country?: string;
    property_type: 'residential' | 'commercial' | 'industrial' | 'land';
    property_size?: number;
    property_size_unit?: string;
    bedrooms?: number;
    bathrooms?: number;
    year_built?: number;
    features?: string[];
    total_value: number;
    token_price: number;
    total_tokens: number;
    available_tokens: number;
    sold_tokens: number;
    expected_roi: number;
    rental_yield: number;
    appreciation_rate?: number;
    dividend_frequency?: number;
    min_investment: number;
    images: string[];
    amenities: string[];
    status: 'draft' | 'upcoming' | 'active' | 'sold_out' | 'closed';
    blockchain: 'ethereum' | 'bsc' | 'sepolia' | 'bsc_testnet';
    contract_address?: string;
    token_id?: number;
    documents: PropertyDocument[];
    created_at: string;
    updated_at: string;
}

export interface PropertyDocument {
    id: number;
    name: string;
    title?: string;
    description?: string;
    type: string;
    file_path: string;
    file_size: number;
    is_public: boolean;
    category: string;
    download_count: number;
    download_url: string;
    formatted_size: string;
    icon: string;
    created_at: string;
}

export interface Investment {
    id: number;
    user_id: number;
    property_id: number;
    property: Property;
    tokens_purchased: number;
    amount_paid: number;
    payment_currency: string;
    tx_hash: string;
    blockchain: string;
    status: 'pending' | 'confirmed' | 'failed';
    created_at: string;
    updated_at: string;
}

export interface Transaction {
    id: number;
    user_id: number;
    investment_id: number;
    type: 'purchase' | 'dividend' | 'withdrawal';
    amount: number;
    currency: string;
    tx_hash: string;
    blockchain: string;
    status: 'pending' | 'confirmed' | 'failed';
    created_at: string;
}

export interface DashboardStats {
    total_invested: number;
    total_properties: number;
    total_tokens: number;
    estimated_returns: number;
    monthly_income: number;
}

export interface PageProps {
    auth: {
        user: User | null;
    };
    flash: {
        success?: string;
        error?: string;
    };
}
