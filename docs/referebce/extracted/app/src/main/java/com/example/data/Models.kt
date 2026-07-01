package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "employees")
data class Employee(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val specialty: String,
    val phone: String,
    val isAvailable: Boolean = true,
    val photoUrl: String = ""
)

@Entity(tableName = "services")
data class ServiceItem(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val price: Double,
    val durationMinutes: Int,
    val category: String
)

@Entity(tableName = "appointments")
data class Appointment(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val clientName: String,
    val clientPhone: String,
    val employeeId: Int,
    val serviceId: Int,
    val dateMillis: Long,
    val timeSlot: String,
    val reminderSent: Boolean = false,
    val notes: String = "",
    val serviceIdsString: String = "" // comma-separated strings of service IDs, e.g. "1,2,3"
)

data class AppointmentWithDetails(
    val appointment: Appointment,
    val employee: Employee?,
    val service: ServiceItem?,
    val services: List<ServiceItem> = emptyList() // NEW list for multiple services
)

@Entity(tableName = "salon_settings")
data class SalonSettings(
    @PrimaryKey val id: Int = 1,
    val salonName: String = "GLOSS & GLOW",
    val logoIndex: Int = 0, // 0: Flor de Loto, 1: Tijeras, 2: Maquillaje, 3: Rostro, 4: Uñas, 5: Glow/Brillo
    val categoriesString: String = "Cabello,Uñas,Rostro,Corporal",
    val themeIndex: Int = 0, // 0: Dorado, 1: Rosa, 2: Champaña, 3: Esmeralda, 4: Orquídea
    val workStartHour: String = "09:00 AM",
    val workEndHour: String = "07:00 PM",
    val blockedDates: String = "", // comma-separated e.g. "20260618"
    val blockedSlots: String = "", // comma-separated e.g. "20260618-10:00"
    val bookingRangeDays: Int = 15, // configurable reservation range in days
    val workDaysString: String = "Martes,Miércoles,Jueves,Viernes,Sábado", // comma-separated Spanish weekdays
    val customLogoUri: String = "", // optional custom user-selected logo photo URI
    val reservationSubtitle: String = "Gestión de Reservas", // custom subtitle for reservation/dashboard tab
    val salonAddress: String = "Calle 50, Ciudad de Panamá, Panamá" // custom address for local salon
)
