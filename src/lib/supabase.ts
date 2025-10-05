import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para o banco de dados
export interface Product {
  id: string
  name: string
  description: string
  price: number
  discount_price?: number
  image_url: string
  category: string
  sizes: string[]
  colors: string[]
  stock: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  created_at: string
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  size: string
  color: string
  created_at: string
  product?: Product
}

export interface Order {
  id: string
  user_id: string
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  payment_url?: string
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  size: string
  color: string
  price: number
  created_at: string
  product?: Product
}

// Funções utilitárias para pagamento
export const generatePaymentLink = (orderId: string, total: number) => {
  // Simulação de link do MercadoPago
  return `https://pay.mercadopago.com.br/checkout/v1/redirect?pref_id=BRITNEY-${orderId.slice(0, 8)}&amount=${total}`
}

// Função para criar usuário admin
export const createAdminUser = async (email: string) => {
  const { data, error } = await supabase
    .from('users')
    .update({ is_admin: true })
    .eq('email', email)
    .select()
  
  return { data, error }
}

// Função para verificar se usuário é admin
export const checkAdminStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single()
  
  return data?.is_admin || false
}