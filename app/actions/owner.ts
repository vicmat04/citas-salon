'use server'

import prisma from '@/lib/db'
import { requireSalonOwner } from '@/lib/auth/helpers'
import { revalidatePath } from 'next/cache'

/**
 * 1. Settings Actions
 */
export async function updateSalonSettings(formData: FormData, salonId: string, slug: string) {
  try {
    // Validar seguridad: el usuario actual es realmente dueño de ESTE salón
    await requireSalonOwner(slug)

    const name = formData.get('name') as string
    const slogan = formData.get('slogan') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const themeColor = formData.get('themeColor') as string

    if (!name) return { error: 'El nombre es requerido' }

    await prisma.salon.update({
      where: { id: salonId },
      data: {
        name,
        slogan: slogan || null,
        phone: phone || null,
        address: address || null,
        themeColor: themeColor || '#000000',
      }
    })

    revalidatePath(`/s/${slug}/settings`)
    return { success: true }
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return { error: 'No tienes permisos o ocurrió un error al guardar.' }
  }
}

/**
 * 2. Specialists Actions
 */
export async function createSpecialist(formData: FormData, salonId: string, slug: string) {
  try {
    await requireSalonOwner(slug)

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const specialty = formData.get('specialty') as string

    if (!name) return { error: 'El nombre es requerido' }

    await prisma.specialist.create({
      data: {
        salonId,
        name,
        email: email || null,
        phone: phone || null,
        specialty: specialty || null,
      }
    })

    revalidatePath(`/s/${slug}/specialists`)
    return { success: true }
  } catch (error: any) {
    console.error('Error creating specialist:', error)
    return { error: 'Error al crear el especialista.' }
  }
}

export async function deleteSpecialist(specialistId: string, salonId: string, slug: string) {
  try {
    await requireSalonOwner(slug)
    
    // Validar que el especialista pertenezca a este salón por seguridad
    const specialist = await prisma.specialist.findUnique({
      where: { id: specialistId }
    })
    
    if (!specialist || specialist.salonId !== salonId) {
       return { error: 'Especialista no encontrado.' }
    }

    await prisma.specialist.delete({
      where: { id: specialistId }
    })

    revalidatePath(`/s/${slug}/specialists`)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting specialist:', error)
    return { error: 'Error al eliminar el especialista.' }
  }
}
