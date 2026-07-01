package com.example.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first

class SalonRepository(private val salonDao: SalonDao) {

    val employees: Flow<List<Employee>> = salonDao.getAllEmployees()
    val services: Flow<List<ServiceItem>> = salonDao.getAllServices()
    val appointments: Flow<List<Appointment>> = salonDao.getAllAppointments()
    val settings: Flow<SalonSettings?> = salonDao.getSettingsFlow()

    // Combining the flow queries to reactively build the combined list
    val allAppointmentsWithDetails: Flow<List<AppointmentWithDetails>> = combine(
        salonDao.getAllAppointments(),
        salonDao.getAllEmployees(),
        salonDao.getAllServices()
    ) { appts, emps, servs ->
        val employeesMap = emps.associateBy { it.id }
        val servicesMap = servs.associateBy { it.id }
        appts.map { appointment ->
            val firstService = servicesMap[appointment.serviceId]
            val extraServiceIds = appointment.serviceIdsString.split(",")
                .mapNotNull { it.toIntOrNull() }
            val selectedServices = if (extraServiceIds.isNotEmpty()) {
                extraServiceIds.mapNotNull { servicesMap[it] }
            } else {
                listOfNotNull(firstService)
            }
            AppointmentWithDetails(
                appointment = appointment,
                employee = employeesMap[appointment.employeeId],
                service = firstService ?: selectedServices.firstOrNull(),
                services = selectedServices.ifEmpty { listOfNotNull(firstService) }
            )
        }
    }

    // Settings actions
    suspend fun insertSettings(settings: SalonSettings) = salonDao.insertSettings(settings)
    suspend fun getSettings(): SalonSettings? = salonDao.getSettings()

    // Employees actions
    suspend fun insertEmployee(employee: Employee) = salonDao.insertEmployee(employee)
    suspend fun updateEmployee(employee: Employee) = salonDao.updateEmployee(employee)
    suspend fun deleteEmployee(employee: Employee) = salonDao.deleteEmployee(employee)
    suspend fun getEmployeeById(id: Int): Employee? = salonDao.getEmployeeById(id)

    // Services actions
    suspend fun insertService(service: ServiceItem) = salonDao.insertService(service)
    suspend fun updateService(service: ServiceItem) = salonDao.updateService(service)
    suspend fun deleteService(service: ServiceItem) = salonDao.deleteService(service)
    suspend fun getServiceById(id: Int): ServiceItem? = salonDao.getServiceById(id)

    // Appointments actions
    suspend fun insertAppointment(appointment: Appointment) = salonDao.insertAppointment(appointment)
    suspend fun updateAppointment(appointment: Appointment) = salonDao.updateAppointment(appointment)
    suspend fun deleteAppointment(appointment: Appointment) = salonDao.deleteAppointment(appointment)
    suspend fun getAppointmentById(id: Int): Appointment? = salonDao.getAppointmentById(id)

    // Seeding method if database is empty
    suspend fun checkAndSeedData() {
        val currentEmployees = employees.first()
        if (currentEmployees.isEmpty()) {
            val defaultEmployees = listOf(
                Employee(name = "Alejandra Silva", specialty = "Estilista Colorista", phone = "+52 1 55 1234 5678"),
                Employee(name = "Carlos Méndez", specialty = "Barbero & Modelador", phone = "+52 1 55 9876 5432"),
                Employee(name = "Sofía Ruíz", specialty = "Manicurista y Pedicurista Spa", phone = "+52 1 55 1111 2222")
            )
            for (emp in defaultEmployees) {
                salonDao.insertEmployee(emp)
            }
        }

        val currentServices = services.first()
        if (currentServices.isEmpty()) {
            val defaultServices = listOf(
                // Category: Cabello
                ServiceItem(name = "Corte de Cabello Dama", price = 25.0, durationMinutes = 45, category = "Cabello"),
                ServiceItem(name = "Corte de Cabello Caballero", price = 15.0, durationMinutes = 30, category = "Cabello"),
                ServiceItem(name = "Tinte Completo & Nutrición", price = 75.0, durationMinutes = 120, category = "Cabello"),
                ServiceItem(name = "Peinado de Noche", price = 35.0, durationMinutes = 60, category = "Cabello"),

                // Category: Uñas
                ServiceItem(name = "Manicura Gel Completa", price = 18.0, durationMinutes = 45, category = "Uñas"),
                ServiceItem(name = "Pedicura Spa Relajante", price = 25.0, durationMinutes = 60, category = "Uñas"),
                ServiceItem(name = "Uñas Acrílicas de Diseño", price = 45.0, durationMinutes = 90, category = "Uñas"),

                // Category: Rostro & Bienestar
                ServiceItem(name = "Tratamiento Facial Purificante", price = 50.0, durationMinutes = 60, category = "Rostro"),
                ServiceItem(name = "Depilación y Diseño de Cejas", price = 12.0, durationMinutes = 20, category = "Rostro"),
                ServiceItem(name = "Maquillaje Profesional", price = 60.0, durationMinutes = 75, category = "Rostro")
            )
            for (service in defaultServices) {
                salonDao.insertService(service)
            }
        }

        val currentSettings = salonDao.getSettings()
        if (currentSettings == null) {
            salonDao.insertSettings(SalonSettings())
        }
    }
}
