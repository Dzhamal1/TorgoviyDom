export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  class?: string;
  sizes?: string;
  manufacturer?: string;
  inStock?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface ContactFormData {
  name: string;
  phone: string;
  message: string;
  preferredContact: 'phone' | 'whatsapp' | 'telegram';
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OrderData {
  items: CartItem[];
  total: number;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    address: string;
  };
}