'use client'

import { useState, useEffect } from 'react'
import { supabase, type Product, type CartItem, type User, type Order } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart, User as UserIcon, Heart, Star, Search, Menu, X, Plus, Minus, Trash2, Settings, LogOut, Package, Users, DollarSign, CreditCard, Eye, EyeOff, Edit, Save } from 'lucide-react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function BritneyStore() {
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCart, setShowCart] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showOrders, setShowOrders] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)

  // Estados para admin
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    discount_price: 0,
    image_url: '',
    category: 'tops',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Pink', 'Purple'],
    stock: 10
  })
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [adminStats, setAdminStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0
  })

  useEffect(() => {
    checkUser()
    loadProducts()
    loadCart()
  }, [])

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      if (userData) {
        setUser(userData)
        if (userData.is_admin) {
          loadAllUsers()
          loadAdminStats()
        }
        loadOrders(userData.id)
      }
    }
    setLoading(false)
  }

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setProducts(data)
  }

  const loadCart = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', authUser.id)
      
      if (data) setCartItems(data)
    }
  }

  const loadOrders = async (userId: string) => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setOrders(data)
  }

  const loadAllUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setAllUsers(data)
  }

  const loadAdminStats = async () => {
    // Carregar estatísticas para o admin
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total, status')
    
    const { data: productsData } = await supabase
      .from('products')
      .select('id')
    
    const { data: usersData } = await supabase
      .from('users')
      .select('id')

    const totalRevenue = ordersData?.reduce((sum, order) => 
      order.status === 'paid' ? sum + order.total : sum, 0) || 0
    
    setAdminStats({
      totalRevenue,
      totalOrders: ordersData?.length || 0,
      totalProducts: productsData?.length || 0,
      totalUsers: usersData?.length || 0
    })
  }

  const addToCart = async (product: Product, size: string, color: string) => {
    if (!user) {
      setShowAuth(true)
      return
    }

    // Verificar se já existe no carrinho
    const existingItem = cartItems.find(item => 
      item.product_id === product.id && item.size === size && item.color === color
    )

    if (existingItem) {
      await updateCartQuantity(existingItem.id, existingItem.quantity + 1)
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
          size,
          color
        })

      if (!error) {
        loadCart()
      }
    }
  }

  const updateCartQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await supabase.from('cart_items').delete().eq('id', itemId)
    } else {
      await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
    }
    loadCart()
  }

  const createProduct = async () => {
    if (!user?.is_admin) return

    const productData = {
      ...newProduct,
      discount_price: newProduct.discount_price > 0 ? newProduct.discount_price : null
    }

    const { error } = await supabase
      .from('products')
      .insert(productData)

    if (!error) {
      loadProducts()
      loadAdminStats()
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        discount_price: 0,
        image_url: '',
        category: 'tops',
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Pink', 'Purple'],
        stock: 10
      })
    }
  }

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    if (!user?.is_admin) return

    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)

    if (!error) {
      loadProducts()
      setEditingProduct(null)
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!user?.is_admin) return

    await supabase.from('products').delete().eq('id', productId)
    loadProducts()
    loadAdminStats()
  }

  const deleteUser = async (userId: string) => {
    if (!user?.is_admin || userId === user.id) return

    await supabase.from('users').delete().eq('id', userId)
    loadAllUsers()
    loadAdminStats()
  }

  const toggleAdminStatus = async (userId: string, isAdmin: boolean) => {
    if (!user?.is_admin || userId === user.id) return

    await supabase
      .from('users')
      .update({ is_admin: !isAdmin })
      .eq('id', userId)
    
    loadAllUsers()
  }

  const createOrder = async () => {
    if (!user || cartItems.length === 0) return

    const total = cartTotal
    
    // Criar pedido
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total,
        status: 'pending',
        payment_url: `https://pay.mercadopago.com.br/checkout/v1/redirect?pref_id=DEMO-${Date.now()}`
      })
      .select()
      .single()

    if (orderError || !orderData) return

    // Criar itens do pedido
    const orderItems = cartItems.map(item => ({
      order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      price: item.product?.discount_price || item.product?.price || 0
    }))

    await supabase.from('order_items').insert(orderItems)

    // Limpar carrinho
    await supabase.from('cart_items').delete().eq('user_id', user.id)

    // Recarregar dados
    loadCart()
    loadOrders(user.id)
    setShowCart(false)

    // Redirecionar para pagamento (simulado)
    window.open(orderData.payment_url, '_blank')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCartItems([])
    setOrders([])
    setShowAdmin(false)
    setShowOrders(false)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const cartTotal = cartItems.reduce((total, item) => {
    const price = item.product?.discount_price || item.product?.price || 0
    return total + (price * item.quantity)
  }, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-300 via-purple-300 to-cyan-300 flex items-center justify-center">
        <div className="text-2xl font-bold text-white animate-pulse">Loading Britney's Closet...</div>
      </div>
    )
  }

  if (showAuth && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-300 via-purple-300 to-cyan-300 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              ✨ Britney's Closet ✨
            </CardTitle>
            <CardDescription className="text-center">
              Entre para acessar sua conta e fazer compras incríveis!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]}
            />
            <Button 
              variant="ghost" 
              onClick={() => setShowAuth(false)}
              className="w-full mt-4"
            >
              Voltar para loja
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-300 via-purple-300 to-cyan-300">
      {/* Header */}
      <header className="bg-white/20 backdrop-blur-md border-b border-white/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X /> : <Menu />}
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-700 bg-clip-text text-transparent">
                ✨ Closet Aur❤️ra ✨
              </h1>
            </div>

            <div className="hidden md:flex items-center space-x-4 flex-1 max-w-md mx-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar roupas dos anos 90..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/80 backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCart(true)}
                className="relative text-white hover:bg-white/20"
              >
                <ShoppingCart />
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </Button>

              {user ? (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowOrders(true)}
                    className="text-white hover:bg-white/20"
                    title="Meus Pedidos"
                  >
                    <Package />
                  </Button>
                  {user.is_admin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowAdmin(true)}
                      className="text-white hover:bg-white/20"
                      title="Painel Admin"
                    >
                      <Settings />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="text-white hover:bg-white/20"
                    title="Sair"
                  >
                    <LogOut />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAuth(true)}
                  className="text-white hover:bg-white/20"
                >
                  <UserIcon />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar roupas dos anos 90..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Categories */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { key: 'all', label: 'Todos os Looks' },
            { key: 'tops', label: 'Tops & Blusas' },
            { key: 'bottoms', label: 'Saias & Calças' },
            { key: 'dresses', label: 'Vestidos' },
            { key: 'accessories', label: 'Acessórios' }
          ].map((category) => (
            <Button
              key={category.key}
              variant={selectedCategory === category.key ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.key)}
              className={`capitalize transition-all duration-300 ${
                selectedCategory === category.key 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' 
                  : 'bg-white/80 backdrop-blur-sm hover:bg-white/90 text-gray-700'
              }`}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="bg-white/90 backdrop-blur-sm hover:bg-white/95 transition-all duration-300 hover:scale-105 hover:shadow-2xl group">
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden rounded-t-xl">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {product.discount_price && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                      -{Math.round(((product.price - product.discount_price) / product.price) * 100)}% OFF
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 text-gray-800">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {product.discount_price ? (
                        <>
                          <span className="text-lg font-bold text-pink-600">
                            R$ {product.discount_price.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            R$ {product.price.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-gray-900">
                          R$ {product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600">4.8</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {product.colors.slice(0, 3).map((color) => (
                        <div
                          key={color}
                          className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm"
                          style={{ 
                            backgroundColor: color.toLowerCase() === 'holographic' ? '#ff69b4' : color.toLowerCase() 
                          }}
                          title={color}
                        />
                      ))}
                      {product.colors.length > 3 && (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
                          <span className="text-xs text-gray-600">+{product.colors.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                      onClick={() => addToCart(product, product.sizes[0], product.colors[0])}
                    >
                      ✨ Adicionar ao Carrinho ✨
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-xl font-bold text-white mb-2">Nenhum produto encontrado</h3>
            <p className="text-white/80">Tente buscar por outros termos ou categorias</p>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto">
            <div className="p-4 border-b bg-gradient-to-r from-pink-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">🛍️ Meu Carrinho</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCart(false)} className="text-white hover:bg-white/20">
                  <X />
                </Button>
              </div>
            </div>
            <div className="p-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">Seu carrinho está vazio</p>
                  <p className="text-sm text-gray-400">Adicione alguns produtos incríveis!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                        <img
                          src={item.product?.image_url}
                          alt={item.product?.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product?.name}</h4>
                          <p className="text-sm text-gray-600">{item.size} • {item.color}</p>
                          <p className="font-bold text-pink-600">
                            R$ {((item.product?.discount_price || item.product?.price || 0) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-red-500"
                            onClick={() => updateCartQuantity(item.id, 0)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold">Total:</span>
                      <span className="text-xl font-bold text-pink-600">
                        R$ {cartTotal.toFixed(2)}
                      </span>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                      onClick={createOrder}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      💳 Finalizar Compra
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Pagamento seguro via MercadoPago
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {showOrders && user && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">📦 Meus Pedidos</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowOrders(false)} className="text-white hover:bg-white/20">
                  <X />
                </Button>
              </div>
            </div>
            <div className="p-6">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Você ainda não fez nenhum pedido</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'paid' ? 'bg-green-100 text-green-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {order.status === 'paid' ? 'Pago' :
                             order.status === 'pending' ? 'Pendente' :
                             order.status === 'shipped' ? 'Enviado' :
                             order.status === 'delivered' ? 'Entregue' :
                             'Cancelado'}
                          </span>
                        </div>
                        <CardDescription>
                          {new Date(order.created_at).toLocaleDateString('pt-BR')} • Total: R$ {order.total.toFixed(2)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                              <img src={item.product?.image_url} alt={item.product?.name} className="w-12 h-12 object-cover rounded" />
                              <div className="flex-1">
                                <p className="font-medium">{item.product?.name}</p>
                                <p className="text-sm text-gray-600">{item.size} • {item.color} • Qtd: {item.quantity}</p>
                              </div>
                              <p className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                        {order.payment_url && order.status === 'pending' && (
                          <Button 
                            className="mt-4 w-full bg-gradient-to-r from-green-500 to-blue-600"
                            onClick={() => window.open(order.payment_url, '_blank')}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pagar Agora
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {showAdmin && user?.is_admin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">⚙️ Painel Administrativo</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowAdmin(false)} className="text-white hover:bg-white/20">
                  <X />
                </Button>
              </div>
            </div>
            <div className="p-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">Total Produtos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Package className="w-6 h-6" />
                      <span className="text-3xl font-bold">{adminStats.totalProducts}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">Total Usuários</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Users className="w-6 h-6" />
                      <span className="text-3xl font-bold">{adminStats.totalUsers}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">Total Pedidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Package className="w-6 h-6" />
                      <span className="text-3xl font-bold">{adminStats.totalOrders}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">Receita Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-6 h-6" />
                      <span className="text-2xl font-bold">R$ {adminStats.totalRevenue.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Add Product Form */}
              <Card className="mb-8">
                <CardHeader className="bg-gradient-to-r from-pink-100 to-purple-100">
                  <CardTitle className="text-purple-800">➕ Adicionar Novo Produto</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Nome do produto"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    />
                    <Input
                      placeholder="Preço original"
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                    />
                    <Input
                      placeholder="Preço com desconto (opcional)"
                      type="number"
                      step="0.01"
                      value={newProduct.discount_price}
                      onChange={(e) => setNewProduct({...newProduct, discount_price: Number(e.target.value)})}
                    />
                    <Input
                      placeholder="Estoque"
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                    />
                    <Input
                      placeholder="URL da imagem"
                      value={newProduct.image_url}
                      onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                      className="md:col-span-2"
                    />
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    >
                      <option value="tops">Tops & Blusas</option>
                      <option value="bottoms">Saias & Calças</option>
                      <option value="dresses">Vestidos</option>
                      <option value="accessories">Acessórios</option>
                    </select>
                    <Input
                      placeholder="Descrição do produto"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    />
                  </div>
                  <Button 
                    className="mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    onClick={createProduct}
                  >
                    ✨ Adicionar Produto
                  </Button>
                </CardContent>
              </Card>

              {/* Products Management */}
              <Card className="mb-8">
                <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100">
                  <CardTitle className="text-blue-800">📦 Gerenciar Produtos</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded" />
                          <div>
                            {editingProduct === product.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={product.name}
                                  onChange={(e) => {
                                    const updatedProducts = products.map(p => 
                                      p.id === product.id ? {...p, name: e.target.value} : p
                                    )
                                    setProducts(updatedProducts)
                                  }}
                                />
                                <div className="flex space-x-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={product.price}
                                    onChange={(e) => {
                                      const updatedProducts = products.map(p => 
                                        p.id === product.id ? {...p, price: Number(e.target.value)} : p
                                      )
                                      setProducts(updatedProducts)
                                    }}
                                  />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Desconto"
                                    value={product.discount_price || ''}
                                    onChange={(e) => {
                                      const updatedProducts = products.map(p => 
                                        p.id === product.id ? {...p, discount_price: Number(e.target.value) || null} : p
                                      )
                                      setProducts(updatedProducts)
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <h4 className="font-medium">{product.name}</h4>
                                <div className="flex items-center space-x-2">
                                  {product.discount_price ? (
                                    <>
                                      <span className="text-green-600 font-bold">R$ {product.discount_price.toFixed(2)}</span>
                                      <span className="text-gray-500 line-through text-sm">R$ {product.price.toFixed(2)}</span>
                                    </>
                                  ) : (
                                    <span className="font-bold">R$ {product.price.toFixed(2)}</span>
                                  )}
                                  <span className="text-sm text-gray-500">• Estoque: {product.stock}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {editingProduct === product.id ? (
                            <Button
                              size="sm"
                              onClick={() => updateProduct(product.id, product)}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingProduct(product.id)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Users Management */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100">
                  <CardTitle className="text-green-800">👥 Gerenciar Usuários</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {allUsers.map((userData) => (
                      <div key={userData.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium">{userData.full_name || userData.email}</h4>
                          <p className="text-sm text-gray-600">{userData.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {userData.is_admin && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Admin</span>
                            )}
                            <span className="text-xs text-gray-500">
                              Cadastrado em {new Date(userData.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {userData.id !== user.id && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleAdminStatus(userData.id, userData.is_admin)}
                                className={userData.is_admin ? 'text-red-600' : 'text-green-600'}
                              >
                                {userData.is_admin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {userData.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteUser(userData.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}