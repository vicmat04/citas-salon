export const mockSalons = [
  {
    id: 'salon-1',
    name: 'Gloss & Glow',
    slug: 'gloss-glow',
    status: 'active',
    plan: 'pro',
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    id: 'salon-2',
    name: 'The Barber Studio',
    slug: 'barber-studio',
    status: 'trial',
    plan: 'free',
    createdAt: '2026-06-20T14:30:00Z',
  },
  {
    id: 'salon-3',
    name: 'Nails by Sarah',
    slug: 'nails-sarah',
    status: 'suspended',
    plan: 'basic',
    createdAt: '2026-05-10T09:15:00Z',
  },
]

export const mockAppointments = [
  {
    id: 'app-1',
    customerName: 'María Pérez',
    customerPhone: '+50764001234',
    serviceNames: ['Corte de Cabello', 'Secado'],
    specialistName: 'Ana',
    date: '2026-07-01',
    startTime: '10:00',
    duration: 60,
    totalPrice: 45.00,
    status: 'confirmed',
  },
  {
    id: 'app-2',
    customerName: 'Juan Gómez',
    customerPhone: '+50764009876',
    serviceNames: ['Corte de Barba'],
    specialistName: 'Carlos',
    date: '2026-07-01',
    startTime: '11:30',
    duration: 30,
    totalPrice: 15.00,
    status: 'pending',
  },
  {
    id: 'app-3',
    customerName: 'Laura Díaz',
    customerPhone: '+50764004567',
    serviceNames: ['Manicura Semi-permanente'],
    specialistName: 'Sofía',
    date: '2026-07-02',
    startTime: '15:00',
    duration: 45,
    totalPrice: 25.00,
    status: 'pending',
  },
]

export const mockServices = [
  {
    id: 'srv-1',
    name: 'Corte de Cabello',
    category: 'Peluquería',
    price: 25.00,
    duration: 45,
    isActive: true,
  },
  {
    id: 'srv-2',
    name: 'Secado',
    category: 'Peluquería',
    price: 20.00,
    duration: 30,
    isActive: true,
  },
  {
    id: 'srv-3',
    name: 'Corte de Barba',
    category: 'Barbería',
    price: 15.00,
    duration: 30,
    isActive: true,
  },
  {
    id: 'srv-4',
    name: 'Manicura Semi-permanente',
    category: 'Uñas',
    price: 25.00,
    duration: 45,
    isActive: true,
  },
]

export const mockSpecialists = [
  {
    id: 'spc-1',
    name: 'Ana',
    specialty: 'Estilista',
    isActive: true,
    photo: null,
  },
  {
    id: 'spc-2',
    name: 'Carlos',
    specialty: 'Barbero',
    isActive: true,
    photo: null,
  },
  {
    id: 'spc-3',
    name: 'Sofía',
    specialty: 'Manicurista',
    isActive: false,
    photo: null,
  },
]

export const mockSalonInfo = {
  name: 'Gloss & Glow',
  slogan: 'Tu mejor versión, todos los días.',
  phone: '+507 6000-0000',
  address: 'Calle 50, San Francisco, Panamá',
  logo: null,
  themeColor: 'rose',
}
