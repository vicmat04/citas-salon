package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.*
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.*

class SalonViewModel(
    application: Application,
    private val repository: SalonRepository
) : AndroidViewModel(application) {

    // Exposing read-only states loaded reactively from database
    val appointments: StateFlow<List<AppointmentWithDetails>> = repository.allAppointmentsWithDetails
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val employees: StateFlow<List<Employee>> = repository.employees
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val services: StateFlow<List<ServiceItem>> = repository.services
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val settings: StateFlow<SalonSettings> = repository.settings
        .map { it ?: SalonSettings() }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = SalonSettings()
        )

    init {
        // Automatically check and seed database with default services & employees if database is empty
        viewModelScope.launch {
            repository.checkAndSeedData()
        }
    }

    // Time slots available for booking in 12-hour format
    val availableTimeSlots = listOf(
        "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
        "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
        "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
        "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM"
    )

    // Employees actions
    fun addEmployee(name: String, specialty: String, phone: String, photoUrl: String = "") {
        viewModelScope.launch {
            repository.insertEmployee(Employee(name = name, specialty = specialty, phone = phone, photoUrl = photoUrl))
        }
    }

    fun updateEmployee(id: Int, name: String, specialty: String, phone: String, isAvailable: Boolean, photoUrl: String) {
        viewModelScope.launch {
            repository.updateEmployee(
                Employee(id = id, name = name, specialty = specialty, phone = phone, isAvailable = isAvailable, photoUrl = photoUrl)
            )
        }
    }

    fun updateEmployeeAvailability(employee: Employee, isAvailable: Boolean) {
        viewModelScope.launch {
            repository.updateEmployee(employee.copy(isAvailable = isAvailable))
        }
    }

    fun deleteEmployee(employee: Employee) {
        viewModelScope.launch {
            repository.deleteEmployee(employee)
        }
    }

    // Services actions
    fun addService(name: String, price: Double, durationMinutes: Int, category: String) {
        viewModelScope.launch {
            repository.insertService(
                ServiceItem(name = name, price = price, durationMinutes = durationMinutes, category = category)
            )
        }
    }

    fun updateService(id: Int, name: String, price: Double, durationMinutes: Int, category: String) {
        viewModelScope.launch {
            repository.insertService(
                ServiceItem(id = id, name = name, price = price, durationMinutes = durationMinutes, category = category)
            )
        }
    }

    fun deleteService(service: ServiceItem) {
        viewModelScope.launch {
            repository.deleteService(service)
        }
    }

    // Settings actions
    fun updateSettings(
        salonName: String = settings.value.salonName,
        logoIndex: Int = settings.value.logoIndex,
        categoriesString: String = settings.value.categoriesString,
        themeIndex: Int = settings.value.themeIndex,
        workStartHour: String = settings.value.workStartHour,
        workEndHour: String = settings.value.workEndHour,
        blockedDates: String = settings.value.blockedDates,
        blockedSlots: String = settings.value.blockedSlots,
        bookingRangeDays: Int = settings.value.bookingRangeDays,
        workDaysString: String = settings.value.workDaysString,
        customLogoUri: String = settings.value.customLogoUri,
        reservationSubtitle: String = settings.value.reservationSubtitle,
        salonAddress: String = settings.value.salonAddress
    ) {
        viewModelScope.launch {
            repository.insertSettings(
                SalonSettings(
                    salonName = salonName,
                    logoIndex = logoIndex,
                    categoriesString = categoriesString,
                    themeIndex = themeIndex,
                    workStartHour = workStartHour,
                    workEndHour = workEndHour,
                    blockedDates = blockedDates,
                    blockedSlots = blockedSlots,
                    bookingRangeDays = bookingRangeDays,
                    workDaysString = workDaysString,
                    customLogoUri = customLogoUri,
                    reservationSubtitle = reservationSubtitle,
                    salonAddress = salonAddress
                )
            )
        }
    }

    // Appointments actions
    fun bookAppointment(
        clientName: String,
        clientPhone: String,
        employeeId: Int,
        serviceId: Int,
        dateMillis: Long,
        timeSlot: String,
        notes: String,
        serviceIdsString: String = ""
    ) {
        viewModelScope.launch {
            repository.insertAppointment(
                Appointment(
                    clientName = clientName,
                    clientPhone = clientPhone,
                    employeeId = employeeId,
                    serviceId = serviceId,
                    dateMillis = dateMillis,
                    timeSlot = timeSlot,
                    notes = notes,
                    serviceIdsString = serviceIdsString
                )
            )
        }
    }

    fun updateAppointment(
        id: Int,
        clientName: String,
        clientPhone: String,
        employeeId: Int,
        serviceId: Int,
        dateMillis: Long,
        timeSlot: String,
        notes: String,
        reminderSent: Boolean = false,
        serviceIdsString: String = ""
    ) {
        viewModelScope.launch {
            repository.updateAppointment(
                Appointment(
                    id = id,
                    clientName = clientName,
                    clientPhone = clientPhone,
                    employeeId = employeeId,
                    serviceId = serviceId,
                    dateMillis = dateMillis,
                    timeSlot = timeSlot,
                    reminderSent = reminderSent,
                    notes = notes,
                    serviceIdsString = serviceIdsString
                )
            )
        }
    }

    fun deleteAppointment(appointment: Appointment) {
        viewModelScope.launch {
            repository.deleteAppointment(appointment)
        }
    }

    fun markReminderSent(appointment: Appointment) {
        viewModelScope.launch {
            repository.updateAppointment(appointment.copy(reminderSent = true))
        }
    }

    // Helper functions
    fun generateWhatsAppReminderUrl(apptWithDetails: AppointmentWithDetails): String {
        val appointment = apptWithDetails.appointment
        val employee = apptWithDetails.employee
        
        // Retain only digits for WhatsApp URL
        val rawPhone = appointment.clientPhone
        val cleanDigits = rawPhone.replace(Regex("[^0-9]"), "")
        val cleanPhone = when {
            cleanDigits.startsWith("507") -> cleanDigits
            cleanDigits.length == 8 -> "507$cleanDigits"
            else -> cleanDigits
        }
        
        val dateText = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(Date(appointment.dateMillis))
        
        // Build services summary
        val servicesList = apptWithDetails.services
        val servicesText = if (servicesList.isNotEmpty()) {
            servicesList.joinToString(", ") { it.name }
        } else {
            apptWithDetails.service?.name ?: "Cuidado de belleza"
        }
        
        val totalPrice = if (servicesList.isNotEmpty()) {
            servicesList.sumOf { it.price }
        } else {
            apptWithDetails.service?.price ?: 0.0
        }

        val currentSettings = settings.value
        val salonNameUpper = currentSettings.salonName.uppercase()
        val addressVal = currentSettings.salonAddress

        val message = """
            *¡Hola, ${appointment.clientName}!* 🌸✨ 
            
            Te recordamos que tienes una cita programada en *${salonNameUpper}*:
            
            💅 *Servicios:* $servicesText
            💵 *Total Estimado:* $${String.format("%.2f", totalPrice)}
            💇 *Atendido por:* ${employee?.name ?: "Especialista"}
            📅 *Fecha:* $dateText
            ⏰ *Hora:* ${appointment.timeSlot} hs
            
            ${if (appointment.notes.isNotBlank()) "📝 *Notas:* ${appointment.notes}\n" else ""}
            📍 *Dirección:* $addressVal
            
            Por favor, confírmanos tu asistencia respondiendo a este mensaje. ¡Te esperamos para consentirte! 💖🧴
        """.trimIndent()
                
        val encodedMessage = URLEncoder.encode(message, "UTF-8")
        return "https://api.whatsapp.com/send?phone=$cleanPhone&text=$encodedMessage"
    }

    // ViewModel Factory class
    class Factory(
        private val application: Application,
        private val repository: SalonRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(SalonViewModel::class.java)) {
                return SalonViewModel(application, repository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}

// Global robust helper to parse 12-hour or 24-hour time to minutes for comparison and math
fun parseTimeToMinutes(timeStr: String): Int {
    try {
        val clean = timeStr.trim().uppercase()
        val parts = clean.split(" ")
        if (parts.size < 2) {
            val timeParts = clean.split(":")
            if (timeParts.size >= 2) {
                val h = timeParts[0].toIntOrNull() ?: 0
                val m = timeParts[1].toIntOrNull() ?: 0
                return h * 60 + m
            }
            return 0
        }
        val amPm = parts[1]
        val timeParts = parts[0].split(":")
        if (timeParts.size < 2) return 0
        var hour = timeParts[0].toIntOrNull() ?: 0
        val min = timeParts[1].toIntOrNull() ?: 0
        if (amPm == "PM" && hour < 12) hour += 12
        if (amPm == "AM" && hour == 12) hour = 0
        return hour * 60 + min
    } catch (e: Exception) {
        return 0
    }
}

// Global robust helper to retrieve standard day name in Spanish
fun getDayOfWeekSpanish(date: Date): String {
    val cal = Calendar.getInstance()
    cal.time = date
    return when (cal.get(Calendar.DAY_OF_WEEK)) {
        Calendar.MONDAY -> "Lunes"
        Calendar.TUESDAY -> "Martes"
        Calendar.WEDNESDAY -> "Miércoles"
        Calendar.THURSDAY -> "Jueves"
        Calendar.FRIDAY -> "Viernes"
        Calendar.SATURDAY -> "Sábado"
        Calendar.SUNDAY -> "Domingo"
        else -> ""
    }
}
