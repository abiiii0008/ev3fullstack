// backend/server.js
// Tienda Innova - API completa (in-memory, lista para pruebas locales)
// 15+ endpoints: productos, auth, carrito, pedidos, categorias, reviews
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'tienda_innova_secret_demo';

/* ---------- Base de datos en memoria (solo para la entrega) ---------- */
let productos = [
  { id: 'p1', name: 'Audifonos inalambricos Logitech G733', price: 59990, description: 'Audífonos RGB, cómodos.' },
  { id: 'p2', name: 'Kumara K552', price: 36990, description: 'Teclado mecánico resistente.' },
  { id: 'p3', name: 'Razer Viper V3', price: 99990, description: 'Mouse con sensor de alta precisión.' },
  { id: 'p4', name: 'Monitor 144Hz 24"', price: 94990, description: 'Monitor FullHD 144Hz con Freesync' }
];
let categorias = [
  { id: 1, name: 'Periféricos' },
  { id: 2, name: 'Monitores' },
  { id: 3, name: 'Ropa' }
];
let usuarios = []; // { id, name, email, passwordHash, address, role }
let carritos = {}; // map userId -> [{ productId, quantity }]
let pedidos = []; // pedidos
let reviews = []; // { id, productoId, userId, rating, comentario }

/* ------------------------ Helpers / Middlewares ----------------------- */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}
function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Acceso denegado' });
}

/* -------------------------- ENDPOINTS (15+) -------------------------- */

/* 1) GET /api/productos - listar productos */
app.get('/api/productos', (req, res) => {
  res.json(productos);
});

/* 2) GET /api/productos/:id - detalle producto */
app.get('/api/productos/:id', (req, res) => {
  const id = req.params.id;
  const p = productos.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(p);
});

/* 3) POST /api/productos - crear producto (admin) */
app.post('/api/productos', authMiddleware, adminOnly, (req, res) => {
  const { id, name, price, description, categoryId } = req.body;
  const newId = id || (`p${productos.length + 1}`);
  const nuevo = { id: newId, name, price, description, categoryId };
  productos.push(nuevo);
  res.status(201).json(nuevo);
});

/* 4) PUT /api/productos/:id - actualizar (admin) */
app.put('/api/productos/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  const p = productos.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  Object.assign(p, req.body);
  res.json(p);
});

/* 5) DELETE /api/productos/:id - eliminar (admin) */
app.delete('/api/productos/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  productos = productos.filter(x => x.id !== id);
  // limpiar reviews relacionadas
  reviews = reviews.filter(r => r.productoId !== id);
  res.json({ mensaje: 'Producto eliminado' });
});

/* 6) POST /api/auth/register - registro */
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, address } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan datos' });
  if (usuarios.find(u => u.email === email)) return res.status(409).json({ error: 'Usuario ya existe' });
  const passwordHash = await bcrypt.hash(password, 10);
  const nuevo = { id: usuarios.length ? usuarios.length + 1 : 1, name, email, passwordHash, address: address || '', role: 'user' };
  usuarios.push(nuevo);
  const token = jwt.sign({ id: nuevo.id, email: nuevo.email, role: nuevo.role }, JWT_SECRET, { expiresIn: '8h' });
  res.status(201).json({ token, user: { id: nuevo.id, name: nuevo.name, email: nuevo.email, role: nuevo.role } });
});

/* 7) POST /api/auth/login - login */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const u = usuarios.find(x => x.email === email);
  if (!u) return res.status(401).json({ error: 'Credenciales inválidas' });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

/* 8) GET /api/auth/profile - perfil usuario (auth) */
app.get('/api/auth/profile', authMiddleware, (req, res) => {
  const u = usuarios.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ id: u.id, name: u.name, email: u.email, address: u.address, role: u.role });
});

/* 9) POST /api/carrito/add - agregar item al carrito (auth) */
app.post('/api/carrito/add', authMiddleware, (req, res) => {
  const userId = String(req.user.id);
  const { productId, quantity } = req.body;
  if (!productId || !quantity) return res.status(400).json({ error: 'Faltan datos' });
  if (!carritos[userId]) carritos[userId] = [];
  const existing = carritos[userId].find(i => i.productId === productId);
  if (existing) existing.quantity += Number(quantity);
  else carritos[userId].push({ productId, quantity: Number(quantity) });
  res.json({ mensaje: 'Agregado al carrito', carrito: carritos[userId] });
});

/* 10) GET /api/carrito - ver carrito usuario (auth) */
app.get('/api/carrito', authMiddleware, (req, res) => {
  const userId = String(req.user.id);
  const items = carritos[userId] || [];
  // enriquecer con datos de producto
  const detalle = items.map(it => {
    const p = productos.find(px => px.id === it.productId) || {};
    return { ...it, product: p };
  });
  res.json({ items: detalle });
});

/* 11) DELETE /api/carrito/:productId - eliminar item del carrito (auth) */
app.delete('/api/carrito/:productId', authMiddleware, (req, res) => {
  const userId = String(req.user.id);
  const pid = req.params.productId;
  if (!carritos[userId]) return res.status(404).json({ error: 'Carrito vacío' });
  carritos[userId] = carritos[userId].filter(i => i.productId !== pid);
  res.json({ mensaje: 'Item eliminado', carrito: carritos[userId] });
});

/* 12) POST /api/pedidos - crear pedido (auth) */
app.post('/api/pedidos', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { items, address, paymentMethod } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items vacíos' });
  const detalle = items.map(it => {
    const p = productos.find(px => px.id === it.productId) || { price: 0 };
    return { productId: it.productId, quantity: it.quantity, price: p.price || 0 };
  });
  const total = detalle.reduce((s, it) => s + (it.quantity * it.price), 0);
  const nuevo = { id: pedidos.length ? pedidos.length + 1 : 1, userId, items: detalle, total, address: address || '', paymentMethod: paymentMethod || 'efectivo', estado: 'pendiente', createdAt: new Date() };
  pedidos.push(nuevo);
  // Limpiar carrito del usuario
  carritos[String(userId)] = [];
  res.status(201).json(nuevo);
});

/* 13) GET /api/pedidos - ver pedidos (auth) - usuarios ven los suyos, admin ve todos */
app.get('/api/pedidos', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') return res.json(pedidos);
  const userOrders = pedidos.filter(p => p.userId === req.user.id);
  res.json(userOrders);
});

/* 14) POST /api/productos/:id/reviews - agregar reseña (auth) */
app.post('/api/productos/:id/reviews', authMiddleware, (req, res) => {
  const productoId = req.params.id;
  const { rating, comentario } = req.body;
  const id = reviews.length ? reviews.length + 1 : 1;
  const nuevo = { id, productoId, userId: req.user.id, rating: Number(rating) || 0, comentario: comentario || '' };
  reviews.push(nuevo);
  res.status(201).json(nuevo);
});

/* 15) GET /api/categorias - listar categorías */
app.get('/api/categorias', (req, res) => {
  res.json(categorias);
});

/* --------------------- Health + seed admin (útil para pruebas) --------------------- */
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// seed admin (solo si no existe)
(async function seedAdmin(){
  if (!usuarios.find(u => u.email === 'admin@innova.com')) {
    const pass = await bcrypt.hash('admin123', 10);
    usuarios.push({ id: 999, name: 'Admin', email: 'admin@innova.com', passwordHash: pass, address: '', role: 'admin' });
    console.log('Admin seed creado: admin@innova.com / admin123');
  }
})();

app.listen(PORT, () => console.log(`🔥 Backend funcionando en http://localhost:${PORT}`));
