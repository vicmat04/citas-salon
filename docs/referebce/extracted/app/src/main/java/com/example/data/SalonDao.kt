package com.example.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface SalonDao {

    // Employees
    @Query("SELECT * FROM employees ORDER BY name ASC")
    fun getAllEmployees(): Flow<List<Employee>>

    @Query("SELECT * FROM employees WHERE id = :id")
    suspend fun getEmployeeById(id: Int): Employee?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEmployee(employee: Employee)

    @Update
    suspend fun updateEmployee(employee: Employee)

    @Delete
    suspend fun deleteEmployee(employee: Employee)


    // Services
    @Query("SELECT * FROM services ORDER BY category ASC, name ASC")
    fun getAllServices(): Flow<List<ServiceItem>>

    @Query("SELECT * FROM services WHERE id = :id")
    suspend fun getServiceById(id: Int): ServiceItem?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertService(service: ServiceItem)

    @Update
    suspend fun updateService(service: ServiceItem)

    @Delete
    suspend fun deleteService(service: ServiceItem)


    // Appointments
    @Query("SELECT * FROM appointments ORDER BY dateMillis ASC, timeSlot ASC")
    fun getAllAppointments(): Flow<List<Appointment>>

    @Query("SELECT * FROM appointments WHERE id = :id")
    suspend fun getAppointmentById(id: Int): Appointment?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAppointment(appointment: Appointment): Long

    @Update
    suspend fun updateAppointment(appointment: Appointment)

    @Delete
    suspend fun deleteAppointment(appointment: Appointment)


    // Settings
    @Query("SELECT * FROM salon_settings WHERE id = 1 LIMIT 1")
    fun getSettingsFlow(): Flow<SalonSettings?>

    @Query("SELECT * FROM salon_settings WHERE id = 1 LIMIT 1")
    suspend fun getSettings(): SalonSettings?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSettings(settings: SalonSettings)
}
