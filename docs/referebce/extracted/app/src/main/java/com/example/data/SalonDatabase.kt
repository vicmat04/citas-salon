package com.example.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [Employee::class, ServiceItem::class, Appointment::class, SalonSettings::class],
    version = 7,
    exportSchema = false
)
abstract class SalonDatabase : RoomDatabase() {

    abstract fun salonDao(): SalonDao

    companion object {
        @Volatile
        private var INSTANCE: SalonDatabase? = null

        fun getDatabase(context: Context): SalonDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SalonDatabase::class.java,
                    "salon_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
