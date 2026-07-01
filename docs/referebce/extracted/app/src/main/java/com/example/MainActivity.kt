package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ViewModelProvider
import com.example.data.SalonDatabase
import com.example.data.SalonRepository
import com.example.ui.SalonApp
import com.example.ui.SalonViewModel
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    // Initialize database and repository layers cleanly
    val database = SalonDatabase.getDatabase(applicationContext)
    val repository = SalonRepository(database.salonDao())

    // Instantiate view model using the lifecycle Factory
    val viewModel: SalonViewModel = ViewModelProvider(
        this, 
        SalonViewModel.Factory(application, repository)
    )[SalonViewModel::class.java]

    setContent {
      MyApplicationTheme {
        SalonApp(viewModel = viewModel)
      }
    }
  }
}
