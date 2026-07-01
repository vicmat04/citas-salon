package com.example.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import com.example.data.Appointment
import com.example.data.AppointmentWithDetails
import com.example.data.Employee
import com.example.data.ServiceItem
import com.example.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.runtime.CompositionLocalProvider

enum class SalonThemePreset(
    val id: Int,
    val title: String,
    val primary: Color,
    val secondary: Color,
    val dark: Color
) {
    DORADO_CLASICO(0, "Dorado Clásico", Color(0xFFD4AF37), Color(0xFFE5C158), Color(0xFFA67C00)),
    ROSA_GLAMOUR(1, "Rosa Glamour", Color(0xFFFF69B4), Color(0xFFFFB6C1), Color(0xFFC71585)),
    CHAMPANA_ROYAL(2, "Champaña Royal", Color(0xFFE0C068), Color(0xFFF1D78F), Color(0xFF947214)),
    ESMERALDA_CHIC(3, "Esmeralda Chic", Color(0xFF00A86B), Color(0xFF4EE298), Color(0xFF006B43)),
    ORQUIDEA_MODERNA(4, "Orquídea Moderna", Color(0xFF9932CC), Color(0xFFBA55D3), Color(0xFF6A1B9A))
}

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun SalonApp(viewModel: SalonViewModel) {
    val settingsState by viewModel.settings.collectAsState()
    val currentPreset = SalonThemePreset.values().find { it.id == settingsState.themeIndex } ?: SalonThemePreset.DORADO_CLASICO

    CompositionLocalProvider(
        LocalThemePrimary provides currentPreset.primary,
        LocalThemeSecondary provides currentPreset.secondary,
        LocalThemeDark provides currentPreset.dark
    ) {
        var activeTab by remember { mutableStateOf("citas") }

        // Navigation and screen-state controllers
        var showAddAppointment by remember { mutableStateOf(false) }
        var showAddEmployee by remember { mutableStateOf(false) }
        var showAddService by remember { mutableStateOf(false) }

        val context = LocalContext.current

        Scaffold(
            bottomBar = {
                NavigationBar(
                    containerColor = CharcoalSurface,
                    tonalElevation = 8.dp,
                    modifier = Modifier.navigationBarsPadding()
                ) {
                    NavigationBarItem(
                        selected = activeTab == "citas",
                        onClick = { activeTab = "citas" },
                        icon = { Icon(Icons.Default.DateRange, contentDescription = "Citas") },
                        label = { Text("Citas") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CharcoalBg,
                            selectedTextColor = GoldPrimary,
                            indicatorColor = GoldPrimary,
                            unselectedIconColor = TextMuted,
                            unselectedTextColor = TextMuted
                        ),
                        modifier = Modifier.testTag("tab_citas")
                    )
                    NavigationBarItem(
                        selected = activeTab == "empleados",
                        onClick = { activeTab = "empleados" },
                        icon = { Icon(Icons.Default.Face, contentDescription = "Empleados") },
                        label = { Text("Personal") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CharcoalBg,
                            selectedTextColor = GoldPrimary,
                            indicatorColor = GoldPrimary,
                            unselectedIconColor = TextMuted,
                            unselectedTextColor = TextMuted
                        ),
                        modifier = Modifier.testTag("tab_empleados")
                    )
                    NavigationBarItem(
                        selected = activeTab == "servicios",
                        onClick = { activeTab = "servicios" },
                        icon = { Icon(Icons.Default.ContentCut, contentDescription = "Servicios") },
                        label = { Text("Servicios") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CharcoalBg,
                            selectedTextColor = GoldPrimary,
                            indicatorColor = GoldPrimary,
                            unselectedIconColor = TextMuted,
                            unselectedTextColor = TextMuted
                        ),
                        modifier = Modifier.testTag("tab_servicios")
                    )
                    NavigationBarItem(
                        selected = activeTab == "configuracion",
                        onClick = { activeTab = "configuracion" },
                        icon = { Icon(Icons.Default.Settings, contentDescription = "Configuración") },
                        label = { Text("Ajustes") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CharcoalBg,
                            selectedTextColor = GoldPrimary,
                            indicatorColor = GoldPrimary,
                            unselectedIconColor = TextMuted,
                            unselectedTextColor = TextMuted
                        ),
                        modifier = Modifier.testTag("tab_configuracion")
                    )
                }
            },
            contentWindowInsets = WindowInsets.safeDrawing
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(CharcoalBg)
                    .padding(innerPadding)
            ) {
                // Main views with smooth animated screen changes
                AnimatedContent(
                    targetState = activeTab,
                    transitionSpec = {
                        fadeIn() togetherWith fadeOut()
                    },
                    label = "MainScreenContents"
                ) { tab ->
                    when (tab) {
                        "citas" -> AppointmentsTab(
                            viewModel = viewModel,
                            onAddAppointmentClick = { showAddAppointment = true }
                        )
                        "empleados" -> EmployeesTab(
                            viewModel = viewModel,
                            onAddEmployeeClick = { showAddEmployee = true }
                        )
                        "servicios" -> ServicesTab(
                            viewModel = viewModel,
                            onAddServiceClick = { showAddService = true }
                        )
                        "configuracion" -> SettingsTab(
                            viewModel = viewModel
                        )
                    }
                }

                // Forms trigger screen animations
                if (showAddAppointment) {
                    AddAppointmentScreen(
                        viewModel = viewModel,
                        onDismiss = { showAddAppointment = false }
                    )
                }

                if (showAddEmployee) {
                    AddEmployeeScreen(
                        viewModel = viewModel,
                        onDismiss = { showAddEmployee = false }
                    )
                }

                if (showAddService) {
                    AddServiceScreen(
                        viewModel = viewModel,
                        onDismiss = { showAddService = false }
                    )
                }
            }
        }
    }
}

// ==========================================
// SCREEN 1: APPOINTMENTS TAB (CITAS)
// ==========================================
@Composable
fun AppointmentsTab(
    viewModel: SalonViewModel,
    onAddAppointmentClick: () -> Unit
) {
    val appointments by viewModel.appointments.collectAsState()
    val settings by viewModel.settings.collectAsState()
    
    var activeFilter by remember { mutableStateOf("upcoming") } // "upcoming", "today", "history"
    var searchQuery by remember { mutableStateOf("") }
    var appointmentToEdit by remember { mutableStateOf<Appointment?>(null) }

    val context = LocalContext.current

    // Formatting date matching to "today"
    val todayFormatter = SimpleDateFormat("yyyyMMdd", Locale.getDefault())
    val todayStr = todayFormatter.format(Date())

    // Start-of-day Milis
    val todayStartMillis = remember {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        calendar.timeInMillis
    }

    val filteredAppointments = remember(appointments, activeFilter, searchQuery) {
        val filteredByTab = when (activeFilter) {
            "today" -> appointments.filter { appt ->
                val apptStr = todayFormatter.format(Date(appt.appointment.dateMillis))
                apptStr == todayStr
            }
            "history" -> appointments.filter { appt ->
                appt.appointment.dateMillis < todayStartMillis
            }
            else -> appointments.filter { appt ->
                appt.appointment.dateMillis >= todayStartMillis
            }
        }

        if (searchQuery.isNotBlank()) {
            filteredByTab.filter { appt ->
                appt.appointment.clientName.contains(searchQuery, ignoreCase = true) ||
                appt.appointment.clientPhone.contains(searchQuery, ignoreCase = true) ||
                (appt.service?.name ?: "").contains(searchQuery, ignoreCase = true) ||
                (appt.employee?.name ?: "").contains(searchQuery, ignoreCase = true)
            }
        } else {
            filteredByTab
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        SalonHeader(
            viewModel = viewModel,
            subtitle = settings.reservationSubtitle,
            actionButton = {
                IconButton(
                    onClick = onAddAppointmentClick,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = GoldPrimary,
                        contentColor = CharcoalBg
                    ),
                    modifier = Modifier
                        .size(48.dp)
                        .testTag("btn_quick_add_appointment")
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Nueva Cita")
                }
            }
        )

        // Filters UI Row (Upcoming vs Today vs History)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilterChip(
                selected = activeFilter == "upcoming",
                onClick = { 
                    activeFilter = "upcoming"
                    searchQuery = "" 
                },
                label = { Text("Próximas", fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = GoldPrimary,
                    selectedLabelColor = CharcoalBg,
                    containerColor = CharcoalSurface,
                    labelColor = OnCharcoalBg
                ),
                border = null
            )
            FilterChip(
                selected = activeFilter == "today",
                onClick = { 
                    activeFilter = "today"
                    searchQuery = "" 
                },
                label = { Text("Hoy", fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = GoldPrimary,
                    selectedLabelColor = CharcoalBg,
                    containerColor = CharcoalSurface,
                    labelColor = OnCharcoalBg
                ),
                border = null
            )
            FilterChip(
                selected = activeFilter == "history",
                onClick = { 
                    activeFilter = "history"
                    searchQuery = ""
                },
                label = { Text("Historial", fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = GoldPrimary,
                    selectedLabelColor = CharcoalBg,
                    containerColor = CharcoalSurface,
                    labelColor = OnCharcoalBg
                ),
                border = null
            )
        }

        // Subtle search bar under filters (visible on all, but particularly useful for Historial)
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Buscar cliente, servicio o especialista...", fontSize = 12.sp) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(16.dp), tint = TextMuted) },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { searchQuery = "" }, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Clear, contentDescription = "Limpiar", modifier = Modifier.size(14.dp), tint = TextMuted)
                    }
                }
            },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextLight,
                unfocusedTextColor = TextLight,
                focusedBorderColor = GoldPrimary.copy(alpha = 0.5f),
                unfocusedBorderColor = CharcoalSurfaceVariant,
                cursorColor = GoldPrimary,
                focusedContainerColor = CharcoalSurface.copy(alpha = 0.5f),
                unfocusedContainerColor = CharcoalSurface.copy(alpha = 0.5f)
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
                .height(46.dp)
        )

        Divider(
            color = CharcoalSurfaceVariant,
            thickness = 1.dp,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        // List or empty state
        if (filteredAppointments.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(24.dp)
                ) {
                    Icon(
                        Icons.Default.DateRange,
                        contentDescription = "Sin citas",
                        modifier = Modifier.size(64.dp),
                        tint = TextMuted
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No hay citas programadas",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = TextLight,
                            fontWeight = FontWeight.Bold
                        ),
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (activeFilter == "today") "¡Estás libre por hoy! No tienes citas de belleza registradas para hoy." else "Registra tu primera cita de belleza presionando el botón superior.",
                        style = MaterialTheme.typography.bodyMedium.copy(color = TextMuted),
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onAddAppointmentClick,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = CharcoalSurface,
                            contentColor = GoldPrimary
                        ),
                        modifier = Modifier.testTag("empty_btn_book")
                    ) {
                        Text("Agendar Nueva Cita")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(
                    items = filteredAppointments,
                    key = { it.appointment.id }
                ) { apptWithDetails ->
                    AppointmentCard(
                        apptWithDetails = apptWithDetails,
                        onSendReminder = {
                            val url = viewModel.generateWhatsAppReminderUrl(apptWithDetails)
                            try {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                context.startActivity(intent)
                                viewModel.markReminderSent(apptWithDetails.appointment)
                            } catch (e: Exception) {
                                Toast.makeText(
                                    context,
                                    "No se pudo abrir WhatsApp. Se marcó como recordatorio enviado.",
                                    Toast.LENGTH_LONG
                                ).show()
                                viewModel.markReminderSent(apptWithDetails.appointment)
                            }
                        },
                        onEditClick = {
                            appointmentToEdit = apptWithDetails.appointment
                        },
                        onDeleteClick = {
                            viewModel.deleteAppointment(apptWithDetails.appointment)
                        }
                    )
                }
            }
        }
    }

    if (appointmentToEdit != null) {
        AddAppointmentScreen(
            viewModel = viewModel,
            appointmentToEdit = appointmentToEdit,
            onDismiss = { appointmentToEdit = null }
        )
    }
}

@Composable
fun AppointmentCard(
    apptWithDetails: AppointmentWithDetails,
    onSendReminder: () -> Unit,
    onEditClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    val appointment = apptWithDetails.appointment
    val employee = apptWithDetails.employee
    val service = apptWithDetails.service

    val dateFormatter = SimpleDateFormat("EEEE, dd MMM yyyy", Locale("es", "ES"))
    val formattedDate = dateFormatter.format(Date(appointment.dateMillis))

    val context = LocalContext.current

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = CharcoalSurface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Client Name & Status indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = appointment.clientName.uppercase(),
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = GoldPrimary,
                            letterSpacing = 0.5.sp
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = appointment.clientPhone,
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                    )
                }

                // Checkbox status indicator for reminder
                if (appointment.reminderSent) {
                    Row(
                        modifier = Modifier
                            .background(HighlightSucceed.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = "Enviado",
                            tint = HighlightSucceed,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Avisado",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = HighlightSucceed,
                                fontWeight = FontWeight.SemiBold
                              )
                        )
                    }
                } else {
                    Row(
                        modifier = Modifier
                            .background(Color.Yellow.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(Color.Yellow, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Por recordar",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Color.Yellow,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Service details & price
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CharcoalBg, RoundedCornerShape(8.dp))
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = service?.name ?: "Servicio Personalizado",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextLight,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Text(
                        text = "Atiende: ${employee?.name ?: "Estilista del Salón"}",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                    )
                }
                Text(
                    text = "$${String.format("%.2f", service?.price ?: 0.0)}",
                    style = MaterialTheme.typography.bodyLarge.copy(
                        color = GoldSecondary,
                        fontWeight = FontWeight.ExtraBold
                    )
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Date & Hour tag row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        Icons.Default.DateRange,
                        contentDescription = "Fecha",
                        tint = GoldPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${formattedDate.replaceFirstChar { it.uppercase() }} a las ${appointment.timeSlot} hs",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = TextLight,
                            fontWeight = FontWeight.SemiBold
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (appointment.notes.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = "Notas",
                        tint = TextMuted,
                        modifier = Modifier
                            .size(14.dp)
                            .padding(top = 2.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = appointment.notes,
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Client Options Shortcut Toolbar (Call, Write WhatsApp, Edit, Delete)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CharcoalBg.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                    .padding(8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Call client
                IconButton(
                    onClick = {
                        try {
                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${appointment.clientPhone}"))
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(context, "No se pudo marcar: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier
                        .background(CharcoalSurfaceVariant, CircleShape)
                        .size(36.dp)
                ) {
                    Icon(
                        Icons.Default.Phone,
                        contentDescription = "Llamar",
                        tint = TextLight,
                        modifier = Modifier.size(16.dp)
                    )
                }

                // WhatsApp write directly (Escribir)
                IconButton(
                    onClick = {
                        try {
                            val cleanNumber = appointment.clientPhone.replace(Regex("[^0-9+]"), "")
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$cleanNumber"))
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(context, "No se pudo abrir WhatsApp: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier
                        .background(CharcoalSurfaceVariant, CircleShape)
                        .size(36.dp)
                ) {
                    Icon(
                        Icons.Default.Chat, // Chat icon representing WhatsApp messaging
                        contentDescription = "Escribir WhatsApp",
                        tint = GoldPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                }

                // WhatsApp appointment reminder (Recordatorio)
                IconButton(
                    onClick = onSendReminder,
                    modifier = Modifier
                        .background(
                            if (appointment.reminderSent) HighlightSucceed.copy(alpha = 0.2f) else CharcoalSurfaceVariant,
                            CircleShape
                        )
                        .size(36.dp)
                        .testTag("btn_whatsapp_${appointment.id}")
                ) {
                    Icon(
                        imageVector = if (appointment.reminderSent) Icons.Default.NotificationsActive else Icons.Default.Notifications,
                        contentDescription = "Enviar Recordatorio",
                        tint = if (appointment.reminderSent) HighlightSucceed else GoldPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                }

                Spacer(modifier = Modifier.weight(1f))

                // Edit Button
                IconButton(
                    onClick = onEditClick,
                    modifier = Modifier
                        .background(CharcoalSurfaceVariant, CircleShape)
                        .size(36.dp)
                        .testTag("btn_edit_appt_shortcut_${appointment.id}")
                ) {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = "Editar Cita",
                        tint = GoldPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                }

                // Delete Button
                IconButton(
                    onClick = onDeleteClick,
                    modifier = Modifier
                        .background(CharcoalSurfaceVariant, CircleShape)
                        .size(36.dp)
                        .testTag("btn_delete_appt_shortcut_${appointment.id}")
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Eliminar Cita",
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}


// ==========================================
// SCREEN 2: EMPLOYEES TAB (SISTEMA DE GESTIÓN DE EMPLEADOS)
// ==========================================
@Composable
fun EmployeesTab(
    viewModel: SalonViewModel,
    onAddEmployeeClick: () -> Unit
) {
    val employees by viewModel.employees.collectAsState()
    var employeeToEdit by remember { mutableStateOf<Employee?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        SalonHeader(
            viewModel = viewModel,
            subtitle = "Sistema de Gestión de Personal",
            actionButton = {
                IconButton(
                    onClick = onAddEmployeeClick,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = GoldPrimary,
                        contentColor = CharcoalBg
                    ),
                    modifier = Modifier
                        .size(48.dp)
                        .testTag("btn_add_employee")
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Contratar o Agregar")
                }
            }
        )

        Divider(
            color = CharcoalSurfaceVariant,
            thickness = 1.dp,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        if (employees.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Face,
                        contentDescription = "Sin personal",
                        modifier = Modifier.size(64.dp),
                        tint = TextMuted
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No hay personal registrado",
                        style = MaterialTheme.typography.titleMedium.copy(color = TextLight),
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Agregue especialistas para poder reservar citas con ellos.",
                        style = MaterialTheme.typography.bodyMedium.copy(color = TextMuted),
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(
                    items = employees,
                    key = { it.id }
                ) { employee ->
                    EmployeeCard(
                        employee = employee,
                        onEditClick = {
                            employeeToEdit = employee
                        },
                        onAvailabilityChange = { isAvailable ->
                            viewModel.updateEmployeeAvailability(employee, isAvailable)
                        },
                        onDeleteClick = {
                            viewModel.deleteEmployee(employee)
                        }
                    )
                }
            }
        }
    }

    if (employeeToEdit != null) {
        AddEmployeeScreen(
            viewModel = viewModel,
            employeeToEdit = employeeToEdit,
            onDismiss = { employeeToEdit = null }
        )
    }
}

@Composable
fun EmployeeCard(
    employee: Employee,
    onEditClick: () -> Unit,
    onAvailabilityChange: (Boolean) -> Unit,
    onDeleteClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = CharcoalSurface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Circle Avatar containing Photo or Initials
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(GoldSecondary, GoldPrimary)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (!employee.photoUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = employee.photoUrl,
                        contentDescription = "Foto de ${employee.name}",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    val initials = employee.name.split(" ")
                        .mapNotNull { it.firstOrNull()?.toString() }
                        .take(2)
                        .joinToString("")
                        .uppercase()

                    Text(
                        text = initials,
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = CharcoalBg,
                            fontWeight = FontWeight.Black
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Body Columns
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = employee.name,
                    style = MaterialTheme.typography.titleMedium.copy(
                        color = TextLight,
                        fontWeight = FontWeight.Bold
                    )
                )
                Text(
                    text = employee.specialty,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = GoldPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Phone,
                        contentDescription = "Tel",
                        tint = TextMuted,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = employee.phone,
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Switch Availability and Actions Column
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = if (employee.isAvailable) "Activo" else "Baja",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = if (employee.isAvailable) HighlightSucceed else TextMuted,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Switch(
                        checked = employee.isAvailable,
                        onCheckedChange = onAvailabilityChange,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = CharcoalBg,
                            checkedTrackColor = GoldPrimary,
                            uncheckedThumbColor = TextMuted,
                            uncheckedTrackColor = CharcoalSurfaceVariant
                        ),
                        modifier = Modifier
                            .scale(0.75f)
                            .testTag("switch_avail_${employee.id}")
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onEditClick,
                        modifier = Modifier
                            .size(36.dp)
                            .testTag("btn_edit_emp_${employee.id}")
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Editar Personal",
                            tint = GoldPrimary.copy(alpha = 0.8f),
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    IconButton(
                        onClick = onDeleteClick,
                        modifier = Modifier
                            .size(36.dp)
                            .testTag("btn_delete_emp_${employee.id}")
                    ) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Eliminar Personal",
                            tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}




// ==========================================
// SCREEN 3: SERVICES TAB
// ==========================================
@Composable
fun ServicesTab(
    viewModel: SalonViewModel,
    onAddServiceClick: () -> Unit
) {
    val services by viewModel.services.collectAsState()
    var serviceToEdit by remember { mutableStateOf<ServiceItem?>(null) }

    // Group services by category for luxury browsing experience
    val servicesByCategory = remember(services) {
        services.groupBy { it.category }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        SalonHeader(
            viewModel = viewModel,
            subtitle = "Servicios de Salud & Belleza",
            actionButton = {
                IconButton(
                    onClick = onAddServiceClick,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = GoldPrimary,
                        contentColor = CharcoalBg
                    ),
                    modifier = Modifier
                        .size(48.dp)
                        .testTag("btn_add_service")
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Añadir Servicio")
                }
            }
        )

        Divider(
            color = CharcoalSurfaceVariant,
            thickness = 1.dp,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        if (services.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Build,
                        contentDescription = "Sin servicios",
                        modifier = Modifier.size(64.dp),
                        tint = TextMuted
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "El catálogo está vacío",
                        style = MaterialTheme.typography.titleMedium.copy(color = TextLight),
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                servicesByCategory.forEach { (category, categoryServices) ->
                    item {
                        Text(
                            text = category.uppercase(),
                            style = MaterialTheme.typography.titleSmall.copy(
                                color = BlushAccent,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            ),
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }

                    items(
                        items = categoryServices,
                        key = { it.id }
                    ) { service ->
                        ServiceRowItem(
                            service = service,
                            onEditClick = {
                                serviceToEdit = service
                            },
                            onDeleteClick = {
                                viewModel.deleteService(service)
                            }
                        )
                    }
                }
            }
        }
    }

    if (serviceToEdit != null) {
        AddServiceScreen(
            viewModel = viewModel,
            serviceToEdit = serviceToEdit,
            onDismiss = { serviceToEdit = null }
        )
    }
}

@Composable
fun ServiceRowItem(
    service: ServiceItem,
    onEditClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = CharcoalSurface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = service.name,
                    style = MaterialTheme.typography.bodyLarge.copy(
                        color = TextLight,
                        fontWeight = FontWeight.Bold
                    )
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = "Duración",
                            tint = TextMuted,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = "${service.durationMinutes} min",
                            style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .size(3.dp)
                            .background(CharcoalSurfaceVariant, CircleShape)
                    )

                    Text(
                        text = "Categoría: ${service.category}",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "$${String.format("%.2f", service.price)}",
                    style = MaterialTheme.typography.bodyLarge.copy(
                        color = GoldPrimary,
                        fontWeight = FontWeight.Black
                    )
                )

                IconButton(
                    onClick = onEditClick,
                    modifier = Modifier
                        .size(36.dp)
                        .testTag("btn_edit_srv_${service.id}")
                ) {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = "Editar Servicio",
                        tint = GoldPrimary.copy(alpha = 0.8f),
                        modifier = Modifier.size(16.dp)
                    )
                }

                IconButton(
                    onClick = onDeleteClick,
                    modifier = Modifier
                        .size(36.dp)
                        .testTag("btn_delete_srv_${service.id}")
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Eliminar Servicio",
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.5f),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}


// ==========================================
// FORM OVERLAY 1: BOOK APPOINTMENT (NUEVA CITA)
// ==========================================
@Composable
fun AddAppointmentScreen(
    viewModel: SalonViewModel,
    appointmentToEdit: Appointment? = null,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val employees by viewModel.employees.collectAsState()
    val services by viewModel.services.collectAsState()
    val settingsState by viewModel.settings.collectAsState()
    val appointmentsState by viewModel.appointments.collectAsState()

    var clientName by remember { mutableStateOf(appointmentToEdit?.clientName ?: "") }
    var clientPhone by remember { mutableStateOf(appointmentToEdit?.clientPhone ?: "") }
    var selectedEmployee by remember { mutableStateOf<Employee?>(null) }
    var selectedServices by remember { mutableStateOf<List<ServiceItem>>(emptyList()) }
    var selectedTimeSlot by remember { mutableStateOf(appointmentToEdit?.timeSlot ?: "") }
    var notes by remember { mutableStateOf(appointmentToEdit?.notes ?: "") }
    var isSpecialEvent by remember {
        mutableStateOf(appointmentToEdit?.notes?.contains("[EVENTO ESPECIAL]") ?: false)
    }

    // Visual upcoming days horizontal selection strip based on configurable booking range
    val upcomingDays = remember(settingsState.bookingRangeDays) {
        val days = mutableListOf<Date>()
        val cal = Calendar.getInstance()
        val limit = if (settingsState.bookingRangeDays > 0) settingsState.bookingRangeDays else 15
        for (i in 0 until limit) {
            days.add(cal.time)
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        days
    }
    
    val blockedDatesSet = remember(settingsState.blockedDates) {
        settingsState.blockedDates.split(",").filter { it.isNotEmpty() }.toSet()
    }
    val allowedWorkDaysSet = remember(settingsState.workDaysString) {
        settingsState.workDaysString.split(",").map { it.trim().lowercase(Locale("es")) }.filter { it.isNotEmpty() }.toSet()
    }

    // A helper to verify if a date is open and available for booking
    val isDateAvailable = remember(blockedDatesSet, allowedWorkDaysSet) {
        { date: Date ->
            val ymd = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(date)
            val dName = getDayOfWeekSpanish(date).lowercase(Locale("es")).trim()
            !blockedDatesSet.contains(ymd) && allowedWorkDaysSet.contains(dName)
        }
    }

    var selectedDate by remember(upcomingDays, settingsState) {
        val firstAvailable = upcomingDays.firstOrNull { isDateAvailable(it) }
        mutableStateOf(
            appointmentToEdit?.let { Date(it.dateMillis) } ?: firstAvailable ?: upcomingDays.firstOrNull() ?: Date()
        )
    }

    // Pre-populate selections if lists are populated
    LaunchedEffect(employees, services, appointmentToEdit) {
        if (appointmentToEdit != null) {
            selectedEmployee = employees.find { it.id == appointmentToEdit.employeeId }
            val editServiceIds = appointmentToEdit.serviceIdsString.split(",")
                .mapNotNull { it.toIntOrNull() }
            selectedServices = if (editServiceIds.isNotEmpty()) {
                services.filter { it.id in editServiceIds }
            } else {
                listOfNotNull(services.find { it.id == appointmentToEdit.serviceId })
            }
        } else {
            if (selectedEmployee == null && employees.isNotEmpty()) {
                selectedEmployee = employees.firstOrNull { it.isAvailable }
            }
            if (selectedServices.isEmpty() && services.isNotEmpty()) {
                selectedServices = listOfNotNull(services.firstOrNull())
            }
        }
    }

    // Offer professionals dynamically according to the selected services
    val filteredEmployees = remember(selectedServices, employees) {
        val available = employees.filter { it.isAvailable }
        if (selectedServices.isEmpty()) {
            available
        } else {
            val categories = selectedServices.map { it.category.lowercase().trim() }.toSet()
            val matched = available.filter { emp ->
                categories.any { cat -> emp.specialty.lowercase().trim().contains(cat) || cat.contains(emp.specialty.lowercase().trim()) }
            }
            matched.ifEmpty { available }
        }
    }

    // Automatically align selectedEmployee to list matches
    LaunchedEffect(filteredEmployees) {
        if (selectedEmployee != null && selectedEmployee!! !in filteredEmployees) {
            selectedEmployee = filteredEmployees.firstOrNull()
        }
    }

    // Dynamic conflict checking & operating hours filtration
    val filteredTimeSlots = remember(appointmentsState, settingsState, selectedDate, selectedEmployee, viewModel.availableTimeSlots) {
        if (!isDateAvailable(selectedDate)) {
            emptyList()
        } else {
            val dateStrForComp = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(selectedDate)
            val blockedSlotsList = settingsState.blockedSlots.split(",")
            
            val bookingsOnThisDate = appointmentsState.filter { apptDet ->
                val appt = apptDet.appointment
                val apptDateStr = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(Date(appt.dateMillis))
                appt.employeeId == selectedEmployee?.id && apptDateStr == dateStrForComp && appt.id != appointmentToEdit?.id
            }.map { it.appointment.timeSlot }.toSet()

            val startMin = parseTimeToMinutes(settingsState.workStartHour)
            val endMin = parseTimeToMinutes(settingsState.workEndHour)

            viewModel.availableTimeSlots.filter { slot ->
                val slotMin = parseTimeToMinutes(slot)
                val isWithinHours = slotMin >= startMin && slotMin < endMin
                val isManuallyBlocked = blockedSlotsList.contains("$dateStrForComp-$slot")
                val isAlreadyBooked = bookingsOnThisDate.contains(slot)
                isWithinHours && !isManuallyBlocked && !isAlreadyBooked
            }
        }
    }

    val totalEstimation = selectedServices.sumOf { it.price }
    val selectedServiceId = selectedServices.firstOrNull()?.id ?: 0
    val commaServiceIds = selectedServices.joinToString(",") { it.id.toString() }

    val isFormComplete = clientName.isNotBlank() &&
            clientPhone.isNotBlank() &&
            selectedEmployee != null &&
            selectedServices.isNotEmpty() &&
            selectedTimeSlot.isNotBlank()

    BackHandler(onBack = onDismiss)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = CharcoalBg,
            contentWindowInsets = WindowInsets.safeDrawing,
            bottomBar = {
                // Pin CTA perfectly to prevent truncation & clipping issues
                Surface(
                    color = CharcoalSurface,
                    tonalElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .imePadding()
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                    ) {
                        Button(
                            onClick = {
                                if (isFormComplete) {
                                    val finalNotes = if (isSpecialEvent) {
                                        if (!notes.contains("[EVENTO ESPECIAL]")) {
                                            "[EVENTO ESPECIAL] $notes".trim()
                                        } else {
                                            notes
                                        }
                                    } else {
                                        notes.replace("[EVENTO ESPECIAL]", "").trim()
                                    }

                                    if (appointmentToEdit != null) {
                                        viewModel.updateAppointment(
                                            id = appointmentToEdit.id,
                                            clientName = clientName,
                                            clientPhone = clientPhone,
                                            employeeId = selectedEmployee!!.id,
                                            serviceId = selectedServiceId,
                                            dateMillis = selectedDate.time,
                                            timeSlot = selectedTimeSlot,
                                            notes = finalNotes,
                                            reminderSent = appointmentToEdit.reminderSent,
                                            serviceIdsString = commaServiceIds
                                        )
                                        Toast.makeText(context, "¡Cita de belleza actualizada exitosamente!", Toast.LENGTH_SHORT).show()
                                    } else {
                                        viewModel.bookAppointment(
                                            clientName = clientName,
                                            clientPhone = clientPhone,
                                            employeeId = selectedEmployee!!.id,
                                            serviceId = selectedServiceId,
                                            dateMillis = selectedDate.time,
                                            timeSlot = selectedTimeSlot,
                                            notes = finalNotes,
                                            serviceIdsString = commaServiceIds
                                        )
                                        Toast.makeText(context, "¡Cita de belleza reservada exitosamente!", Toast.LENGTH_SHORT).show()
                                    }
                                    onDismiss()
                                }
                            },
                            enabled = isFormComplete,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = GoldPrimary,
                                contentColor = CharcoalBg,
                                disabledContainerColor = CharcoalSurfaceVariant,
                                disabledContentColor = TextMuted
                            ),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .testTag("btn_save_appointment")
                        ) {
                            Text(
                                if (appointmentToEdit != null) "GUARDAR CAMBIOS" else "AGENDAR CITA ($${String.format("%.2f", totalEstimation)})",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                            )
                        }
                    }
                }
            }
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 16.dp)
            ) {
                // Header custom toolbar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.testTag("btn_close_add_appt")
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Cancelar",
                            tint = TextLight
                        )
                    }
                    Text(
                        text = if (appointmentToEdit != null) "MODIFICAR CITA" else "RESERVAR NUEVA CITA",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = GoldPrimary,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.sp
                        ),
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    // Cita Especial / Fuera de Horario Banner Switch
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, GoldPrimary.copy(alpha = 0.3f), RoundedCornerShape(12.dp)),
                            colors = CardDefaults.cardColors(containerColor = CharcoalSurface),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Cita Especial o Fuera de Horario",
                                        style = MaterialTheme.typography.bodyMedium.copy(
                                            color = GoldPrimary,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                    Text(
                                        text = "Permite programar domingos, feriados o ingresar cualquier hora (bodas, XV años, etc.)",
                                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                                    )
                                }
                                Switch(
                                    checked = isSpecialEvent,
                                    onCheckedChange = { 
                                        isSpecialEvent = it
                                        if (it) {
                                            if (selectedTimeSlot.isBlank()) {
                                                selectedTimeSlot = "08:00 AM" // default fallback
                                            }
                                        }
                                    },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = GoldPrimary,
                                        checkedTrackColor = GoldPrimary.copy(alpha = 0.4f),
                                        uncheckedThumbColor = TextMuted,
                                        uncheckedTrackColor = CharcoalBg
                                    )
                                )
                            }
                        }
                    }

                    // Section 1: Client data
                    item {
                        Text(
                            text = "1. Información del Cliente",
                            style = MaterialTheme.typography.titleSmall.copy(
                                color = BlushAccent,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = clientName,
                            onValueChange = { clientName = it },
                            label = { Text("Nombre Completo") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextLight,
                                unfocusedTextColor = TextLight,
                                focusedBorderColor = GoldPrimary,
                                unfocusedBorderColor = CharcoalSurfaceVariant,
                                cursorColor = GoldPrimary,
                                focusedLabelColor = GoldPrimary,
                                unfocusedLabelColor = TextMuted
                            ),
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_client_name"),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = clientPhone,
                            onValueChange = { clientPhone = it },
                            label = { Text("Teléfono de WhatsApp (Ej: 6123-4567)") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextLight,
                                unfocusedTextColor = TextLight,
                                focusedBorderColor = GoldPrimary,
                                unfocusedBorderColor = CharcoalSurfaceVariant,
                                cursorColor = GoldPrimary,
                                focusedLabelColor = GoldPrimary,
                                unfocusedLabelColor = TextMuted
                            ),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_client_phone"),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    // Section 2: Services
                    item {
                        Text(
                            text = "2. Seleccionar Servicios (Elige uno o más)",
                            style = MaterialTheme.typography.titleSmall.copy(
                                color = BlushAccent,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        if (services.isEmpty()) {
                            Text(
                                "No hay servicios disponibles. Agrégalos en la pestaña de Servicios.",
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        } else {
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(services) { service ->
                                    val isSelected = selectedServices.any { it.id == service.id }
                                    Card(
                                        modifier = Modifier
                                            .width(160.dp)
                                            .height(94.dp)
                                            .clickable {
                                                selectedServices = if (isSelected) {
                                                    selectedServices.filter { it.id != service.id }
                                                } else {
                                                    selectedServices + service
                                                }
                                            }
                                            .border(
                                                width = if (isSelected) 2.dp else 1.dp,
                                                color = if (isSelected) GoldPrimary else CharcoalSurfaceVariant,
                                                shape = RoundedCornerShape(12.dp)
                                            ),
                                        colors = CardDefaults.cardColors(
                                            containerColor = if (isSelected) CharcoalSurfaceVariant else CharcoalSurface
                                        ),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxSize()
                                                .padding(10.dp),
                                            verticalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.Top
                                            ) {
                                                Text(
                                                    text = service.name,
                                                    style = MaterialTheme.typography.bodySmall.copy(
                                                        fontWeight = FontWeight.Bold,
                                                        color = TextLight
                                                    ),
                                                    maxLines = 2,
                                                    overflow = TextOverflow.Ellipsis,
                                                    modifier = Modifier.weight(1f)
                                                )
                                                if (isSelected) {
                                                    Box(
                                                        modifier = Modifier
                                                            .size(16.dp)
                                                            .background(GoldPrimary, CircleShape),
                                                        contentAlignment = Alignment.Center
                                                    ) {
                                                        Icon(
                                                            Icons.Default.Check,
                                                            contentDescription = "Seleccionado",
                                                            tint = CharcoalBg,
                                                            modifier = Modifier.size(10.dp)
                                                        )
                                                    }
                                                }
                                            }
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = "${service.durationMinutes}m",
                                                    style = MaterialTheme.typography.bodySmall.copy(
                                                        color = TextMuted,
                                                        fontSize = 11.sp
                                                    )
                                                )
                                                Text(
                                                    text = "$${service.price.toInt()}",
                                                    style = MaterialTheme.typography.bodySmall.copy(
                                                        color = GoldPrimary,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 12.sp
                                                    )
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Section 3: Employees
                    item {
                        Text(
                            text = "3. Seleccionar Profesional (Ofrecidos según servicios)",
                            style = MaterialTheme.typography.titleSmall.copy(
                                color = BlushAccent,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        if (filteredEmployees.isEmpty()) {
                            Text(
                                "No hay especialistas disponibles de momento.",
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        } else {
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(filteredEmployees) { emp ->
                                    val isSelected = selectedEmployee?.id == emp.id
                                    Box(
                                        modifier = Modifier
                                            .clickable { selectedEmployee = emp }
                                            .background(
                                                color = if (isSelected) GoldPrimary else CharcoalSurface,
                                                shape = RoundedCornerShape(16.dp)
                                            )
                                            .border(
                                                width = 1.dp,
                                                color = if (isSelected) GoldPrimary else CharcoalSurfaceVariant,
                                                shape = RoundedCornerShape(16.dp)
                                            )
                                            .padding(horizontal = 16.dp, vertical = 10.dp)
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                text = emp.name,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isSelected) CharcoalBg else TextLight
                                                )
                                            )
                                            Text(
                                                text = emp.specialty,
                                                style = MaterialTheme.typography.bodySmall.copy(
                                                    color = if (isSelected) CharcoalBg.copy(alpha = 0.8f) else GoldPrimary
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Section 4: Date Horizontal Strip Picker
                    item {
                        Text(
                            text = "4. Seleccionar Fecha (60 días disponibles)",
                            style = MaterialTheme.typography.titleSmall.copy(
                                color = BlushAccent,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(upcomingDays) { date ->
                                val dayName = SimpleDateFormat("E", Locale("es", "ES")).format(date).uppercase()
                                val dayNum = SimpleDateFormat("dd", Locale("es", "ES")).format(date)
                                val monthName = SimpleDateFormat("MMM", Locale("es", "ES")).format(date).uppercase()

                                val dateStr = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(date)
                                val isBlocked = !isDateAvailable(date) && !isSpecialEvent

                                val isSelected = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(selectedDate) == dateStr

                                Card(
                                    modifier = Modifier
                                        .width(64.dp)
                                        .height(88.dp)
                                        .clickable { if (!isBlocked) selectedDate = date }
                                        .border(
                                            width = if (isSelected) 2.dp else 1.dp,
                                            color = if (isSelected) GoldPrimary else if (isBlocked) MaterialTheme.colorScheme.error.copy(alpha = 0.3f) else CharcoalSurfaceVariant,
                                            shape = RoundedCornerShape(12.dp)
                                        ),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isBlocked) CharcoalSurface.copy(alpha = 0.5f) else if (isSelected) CharcoalSurfaceVariant else CharcoalSurface
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxSize(),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.Center
                                    ) {
                                        if (isBlocked) {
                                            Icon(
                                                Icons.Default.Lock,
                                                contentDescription = "Bloqueado",
                                                tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f),
                                                modifier = Modifier.size(14.dp)
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = "CERRADO",
                                                style = MaterialTheme.typography.bodySmall.copy(
                                                    color = MaterialTheme.colorScheme.error,
                                                    fontSize = 8.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            )
                                        } else {
                                            Text(
                                                text = dayName,
                                                style = MaterialTheme.typography.bodySmall.copy(
                                                    color = if (isSelected) GoldPrimary else TextMuted,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 11.sp
                                                )
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = dayNum,
                                                style = MaterialTheme.typography.titleLarge.copy(
                                                    color = TextLight,
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 20.sp
                                                )
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = monthName.replace(".", ""),
                                                style = MaterialTheme.typography.bodySmall.copy(
                                                    color = TextMuted,
                                                    fontSize = 9.sp
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Section 5: Available Hours Chip Grid
                    item {
                        Text(
                            text = "5. Horarios Disponibles",
                            style = MaterialTheme.typography.titleSmall.copy(
                                color = BlushAccent,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        if (isSpecialEvent) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = selectedTimeSlot,
                                    onValueChange = { selectedTimeSlot = it },
                                    label = { Text("Hora Especial Personalizada (Ej: 06:30 AM, 10:00 PM)") },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = TextLight,
                                        unfocusedTextColor = TextLight,
                                        focusedBorderColor = GoldPrimary,
                                        unfocusedBorderColor = CharcoalSurfaceVariant,
                                        cursorColor = GoldPrimary,
                                        focusedLabelColor = GoldPrimary,
                                        unfocusedLabelColor = TextMuted
                                    ),
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                if (filteredTimeSlots.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = "O elige uno de los horarios estándar del salón:",
                                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    FlowRow(
                                        mainAxisSpacing = 8.dp,
                                        crossAxisSpacing = 8.dp,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        filteredTimeSlots.forEach { slot ->
                                            val isSelected = selectedTimeSlot == slot
                                            Box(
                                                modifier = Modifier
                                                    .clickable { selectedTimeSlot = slot }
                                                    .background(
                                                        color = if (isSelected) GoldPrimary else CharcoalSurface,
                                                        shape = RoundedCornerShape(12.dp)
                                                    )
                                                    .border(
                                                        width = 1.dp,
                                                        color = if (isSelected) GoldPrimary else CharcoalSurfaceVariant,
                                                        shape = RoundedCornerShape(12.dp)
                                                    )
                                                    .padding(horizontal = 14.dp, vertical = 8.dp)
                                            ) {
                                                Text(
                                                    text = slot,
                                                    style = MaterialTheme.typography.bodyMedium.copy(
                                                        fontWeight = FontWeight.Bold,
                                                        color = if (isSelected) CharcoalBg else TextLight
                                                    )
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            val isDayOpen = isDateAvailable(selectedDate)
                            if (filteredTimeSlots.isEmpty()) {
                                Text(
                                    text = if (!isDayOpen) {
                                        "¡El salón se encuentra cerrado o no labora este día! Por favor selecciona otra fecha."
                                    } else {
                                        "No hay horarios disponibles para esta selección."
                                    },
                                    color = if (!isDayOpen) MaterialTheme.colorScheme.error else TextMuted,
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        fontWeight = if (!isDayOpen) FontWeight.Bold else FontWeight.Normal
                                    )
                                )
                            } else {
                                FlowRow(
                                    mainAxisSpacing = 8.dp,
                                    crossAxisSpacing = 8.dp,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    filteredTimeSlots.forEach { slot ->
                                        val isSelected = selectedTimeSlot == slot
                                        Box(
                                            modifier = Modifier
                                                .clickable { selectedTimeSlot = slot }
                                                .background(
                                                    color = if (isSelected) GoldPrimary else CharcoalSurface,
                                                    shape = RoundedCornerShape(12.dp)
                                                )
                                                .border(
                                                    width = 1.dp,
                                                    color = if (isSelected) GoldPrimary else CharcoalSurfaceVariant,
                                                    shape = RoundedCornerShape(12.dp)
                                                )
                                                .padding(horizontal = 14.dp, vertical = 8.dp)
                                        ) {
                                            Text(
                                                text = slot,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isSelected) CharcoalBg else TextLight
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Section 6: Notes Form field
                    item {
                        Text(
                            text = "6. Notas de Preferencia (Opcional)",
                            style = MaterialTheme.typography.titleSmall.copy(
                                color = BlushAccent,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = notes,
                            onValueChange = { notes = it },
                            placeholder = { Text("Ej: Alérgica a esmaltes tradicionales, corte asimétrico...") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextLight,
                                unfocusedTextColor = TextLight,
                                focusedBorderColor = GoldPrimary,
                                unfocusedBorderColor = CharcoalSurfaceVariant,
                                cursorColor = GoldPrimary,
                                focusedPlaceholderColor = TextMuted,
                                unfocusedPlaceholderColor = TextMuted
                            ),
                            maxLines = 3,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_appointment_notes"),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    // Submit Trigger padding
                    item {
                        Spacer(modifier = Modifier.height(80.dp)) // padding so content doesn't hide behind bottom sticky bar
                    }
                }
            }
        }
    }
}

// Custom flow row layout helper
@Composable
fun FlowRow(
    mainAxisSpacing: androidx.compose.ui.unit.Dp,
    crossAxisSpacing: androidx.compose.ui.unit.Dp,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    androidx.compose.ui.layout.Layout(
        content = content,
        modifier = modifier
    ) { measurables, constraints ->
        val mainSpacingPx = mainAxisSpacing.roundToPx()
        val crossSpacingPx = crossAxisSpacing.roundToPx()

        val rows = mutableListOf<MutableList<androidx.compose.ui.layout.Placeable>>()
        val rowHeights = mutableListOf<Int>()
        val rowWidths = mutableListOf<Int>()

        var currentRow = mutableListOf<androidx.compose.ui.layout.Placeable>()
        var currentRowWidth = 0
        var currentRowHeight = 0

        for (measurable in measurables) {
            val placeable = measurable.measure(constraints.copy(minWidth = 0, minHeight = 0))

            if (currentRowWidth + placeable.width > constraints.maxWidth && currentRow.isNotEmpty()) {
                rows.add(currentRow)
                rowHeights.add(currentRowHeight)
                rowWidths.add(currentRowWidth)

                currentRow = mutableListOf()
                currentRowWidth = 0
                currentRowHeight = 0
            }

            currentRow.add(placeable)
            currentRowWidth += placeable.width + mainSpacingPx
            currentRowHeight = maxOf(currentRowHeight, placeable.height)
        }

        if (currentRow.isNotEmpty()) {
            rows.add(currentRow)
            rowHeights.add(currentRowHeight)
            rowWidths.add(currentRowWidth)
        }

        val totalHeight = rowHeights.sum() + (rows.size - 1) * crossSpacingPx
        val totalWidth = constraints.maxWidth

        layout(totalWidth, totalHeight) {
            var currentY = 0
            rows.forEachIndexed { rowIndex, row ->
                var currentX = 0
                row.forEach { placeable ->
                    placeable.placeRelative(currentX, currentY)
                    currentX += placeable.width + mainSpacingPx
                }
                currentY += rowHeights[rowIndex] + crossSpacingPx
            }
        }
    }
}


// ==========================================
// FORM OVERLAY 2: ADD EMPLOYEE (NUEVO EMPLEADO)
// ==========================================
@Composable
fun AddEmployeeScreen(
    viewModel: SalonViewModel,
    employeeToEdit: Employee? = null,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(employeeToEdit?.name ?: "") }
    var specialty by remember { mutableStateOf(employeeToEdit?.specialty ?: "") }
    var phone by remember { mutableStateOf(employeeToEdit?.phone ?: "") }
    var photoUrl by remember { mutableStateOf(employeeToEdit?.photoUrl ?: "") }

    val context = LocalContext.current

    // Common specialties helper
    val specialtiesList = listOf(
        "Estilista Profesional", "Colorista", "Barbero", "Manicurista", "Pedicurista", "Maquillista"
    )

    // Gallery Image Picker Launcher
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            photoUrl = uri.toString()
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(16.dp)),
            colors = CardDefaults.cardColors(containerColor = CharcoalBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
            ) {
                Text(
                    text = if (employeeToEdit != null) "EDITAR PERSONAL" else "AÑADIR PERSONAL",
                    style = MaterialTheme.typography.titleMedium.copy(
                        color = GoldPrimary,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                )
                Text(
                    text = if (employeeToEdit != null) "Modifica los datos del especialista" else "Registrar nuevo especialista al salón",
                    style = MaterialTheme.typography.bodySmall.copy(color = TextMuted),
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Avatar Photo Selection Section
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(
                                brush = Brush.radialGradient(
                                    colors = listOf(GoldSecondary, GoldPrimary)
                                )
                            )
                            .border(1.dp, GoldPrimary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        if (photoUrl.isNotBlank()) {
                            AsyncImage(
                                model = photoUrl,
                                contentDescription = "Foto de perfil",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "Avatar de reemplazo",
                                tint = CharcoalBg,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { launcher.launch("image/*") },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = CharcoalSurface,
                                    contentColor = GoldPrimary
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .border(1.dp, GoldPrimary, RoundedCornerShape(8.dp))
                                    .height(36.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Icon(
                                    Icons.Default.Upload,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Foto de Galería", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        if (photoUrl.isNotBlank()) {
                            TextButton(
                                onClick = { photoUrl = "" },
                                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                                contentPadding = PaddingValues(0.dp),
                                modifier = Modifier.height(24.dp)
                            ) {
                                Text("Quitar foto", fontSize = 11.sp)
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = photoUrl,
                    onValueChange = { photoUrl = it },
                    label = { Text("O URL de Imagen (Opcional)") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextLight,
                        unfocusedTextColor = TextLight,
                        focusedBorderColor = GoldPrimary,
                        unfocusedBorderColor = CharcoalSurfaceVariant,
                        cursorColor = GoldPrimary,
                        focusedLabelColor = GoldPrimary,
                        unfocusedLabelColor = TextMuted
                    ),
                    singleLine = true,
                    placeholder = { Text("https://url.com/foto.jpg") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nombre Completo") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextLight,
                        unfocusedTextColor = TextLight,
                        focusedBorderColor = GoldPrimary,
                        unfocusedBorderColor = CharcoalSurfaceVariant,
                        cursorColor = GoldPrimary,
                        focusedLabelColor = GoldPrimary,
                        unfocusedLabelColor = TextMuted
                    ),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("input_emp_name")
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = specialty,
                    onValueChange = { specialty = it },
                    label = { Text("Especialidad (Ej: Manicurista, Estilista...)") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextLight,
                        unfocusedTextColor = TextLight,
                        focusedBorderColor = GoldPrimary,
                        unfocusedBorderColor = CharcoalSurfaceVariant,
                        cursorColor = GoldPrimary,
                        focusedLabelColor = GoldPrimary,
                        unfocusedLabelColor = TextMuted
                    ),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("input_emp_specialty")
                )

                // Quick selection chips
                Spacer(modifier = Modifier.height(4.dp))
                FlowRow(mainAxisSpacing = 6.dp, crossAxisSpacing = 6.dp) {
                    specialtiesList.forEach { spec ->
                        Box(
                            modifier = Modifier
                                .clickable { specialty = spec }
                                .background(CharcoalSurface, RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                spec,
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = TextMuted,
                                    fontSize = 11.sp
                                )
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Teléfono de Contacto") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextLight,
                        unfocusedTextColor = TextLight,
                        focusedBorderColor = GoldPrimary,
                        unfocusedBorderColor = CharcoalSurfaceVariant,
                        cursorColor = GoldPrimary,
                        focusedLabelColor = GoldPrimary,
                        unfocusedLabelColor = TextMuted
                    ),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("input_emp_phone")
                )

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    TextButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancelar", color = TextMuted)
                    }

                    val isValid = name.isNotBlank() && specialty.isNotBlank() && phone.isNotBlank()
                    Button(
                        onClick = {
                            if (isValid) {
                                if (employeeToEdit != null) {
                                    viewModel.updateEmployee(
                                        id = employeeToEdit.id,
                                        name = name,
                                        specialty = specialty,
                                        phone = phone,
                                        isAvailable = employeeToEdit.isAvailable,
                                        photoUrl = photoUrl
                                    )
                                    Toast.makeText(context, "Profesional actualizado exitosamente", Toast.LENGTH_SHORT).show()
                                } else {
                                    viewModel.addEmployee(name, specialty, phone, photoUrl = photoUrl)
                                    Toast.makeText(context, "Profesional agregado exitosamente", Toast.LENGTH_SHORT).show()
                                }
                                onDismiss()
                            }
                        },
                        enabled = isValid,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GoldPrimary,
                            contentColor = CharcoalBg,
                            disabledContainerColor = CharcoalSurfaceVariant,
                            disabledContentColor = TextMuted
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .weight(1.5f)
                            .testTag("btn_save_employee")
                    ) {
                        Text("Guardar", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}


// ==========================================
// FORM OVERLAY 3: ADD/EDIT SERVICE (NUEVO/EDITAR SERVICIO)
// ==========================================
@Composable
fun AddServiceScreen(
    viewModel: SalonViewModel,
    serviceToEdit: ServiceItem? = null,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(serviceToEdit?.name ?: "") }
    var priceStr by remember { mutableStateOf(serviceToEdit?.let { String.format(Locale.US, "%.2f", it.price) } ?: "") }
    var durationStr by remember { mutableStateOf(serviceToEdit?.durationMinutes?.toString() ?: "") }
    var category by remember { mutableStateOf(serviceToEdit?.category ?: "") }

    val context = LocalContext.current
    val settingsState by viewModel.settings.collectAsState()
    val categories = remember(settingsState.categoriesString) {
        settingsState.categoriesString.split(",").map { it.trim() }.filter { it.isNotEmpty() }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(16.dp)),
            colors = CardDefaults.cardColors(containerColor = CharcoalBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
            ) {
                Text(
                    text = if (serviceToEdit != null) "EDITAR SERVICIO" else "AÑADIR SERVICIO",
                    style = MaterialTheme.typography.titleMedium.copy(
                        color = GoldPrimary,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                )
                Text(
                    text = if (serviceToEdit != null) "Modificar detalles del servicio de belleza" else "Registrar un nuevo servicio al catálogo",
                    style = MaterialTheme.typography.bodySmall.copy(color = TextMuted),
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nombre del Servicio") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextLight,
                        unfocusedTextColor = TextLight,
                        focusedBorderColor = GoldPrimary,
                        unfocusedBorderColor = CharcoalSurfaceVariant,
                        cursorColor = GoldPrimary,
                        focusedLabelColor = GoldPrimary,
                        unfocusedLabelColor = TextMuted
                    ),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("input_srv_name")
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = priceStr,
                        onValueChange = { priceStr = it },
                        label = { Text("Precio ($)") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextLight,
                            unfocusedTextColor = TextLight,
                            focusedBorderColor = GoldPrimary,
                            unfocusedBorderColor = CharcoalSurfaceVariant,
                            cursorColor = GoldPrimary,
                            focusedLabelColor = GoldPrimary,
                            unfocusedLabelColor = TextMuted
                        ),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier
                            .weight(1f)
                            .testTag("input_srv_price")
                    )

                    OutlinedTextField(
                        value = durationStr,
                        onValueChange = { durationStr = it },
                        label = { Text("Duración (min)") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextLight,
                            unfocusedTextColor = TextLight,
                            focusedBorderColor = GoldPrimary,
                            unfocusedBorderColor = CharcoalSurfaceVariant,
                            cursorColor = GoldPrimary,
                            focusedLabelColor = GoldPrimary,
                            unfocusedLabelColor = TextMuted
                        ),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier
                            .weight(1.1f)
                            .testTag("input_srv_duration")
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    "Categoría:",
                    style = MaterialTheme.typography.bodyMedium.copy(color = TextLight, fontWeight = FontWeight.Bold)
                )
                Spacer(modifier = Modifier.height(6.dp))

                // Custom horizontal Chip selection for Categories
                FlowRow(mainAxisSpacing = 6.dp, crossAxisSpacing = 6.dp) {
                    categories.forEach { cat ->
                        val isSelected = category == cat
                        Box(
                            modifier = Modifier
                                .clickable { category = cat }
                                .background(
                                    color = if (isSelected) GoldPrimary else CharcoalSurface,
                                    shape = RoundedCornerShape(8.dp)
                                )
                                .border(
                                    width = 1.dp,
                                    color = if (isSelected) GoldPrimary else CharcoalSurfaceVariant,
                                    shape = RoundedCornerShape(8.dp)
                                )
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                cat,
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = if (isSelected) CharcoalBg else OnCharcoalBg,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    TextButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancelar", color = TextMuted)
                    }

                    val price = priceStr.toDoubleOrNull()
                    val duration = durationStr.toIntOrNull()
                    val isValid = name.isNotBlank() && price != null && duration != null && category.isNotBlank()

                    Button(
                        onClick = {
                            if (isValid && price != null && duration != null) {
                                if (serviceToEdit != null) {
                                    viewModel.updateService(serviceToEdit.id, name, price, duration, category)
                                    Toast.makeText(context, "Servicio actualizado exitosamente", Toast.LENGTH_SHORT).show()
                                } else {
                                    viewModel.addService(name, price, duration, category)
                                    Toast.makeText(context, "Servicio agregado exitosamente", Toast.LENGTH_SHORT).show()
                                }
                                onDismiss()
                            }
                        },
                        enabled = isValid,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GoldPrimary,
                            contentColor = CharcoalBg,
                            disabledContainerColor = CharcoalSurfaceVariant,
                            disabledContentColor = TextMuted
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .weight(1.5f)
                            .testTag("btn_save_service")
                    ) {
                        Text("Guardar", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}


// ==========================================
// SHARED HEADERS & CUSTOMIZATIONS
// ==========================================
@Composable
fun SalonHeader(
    viewModel: SalonViewModel,
    subtitle: String,
    actionButton: @Composable (() -> Unit)? = null
) {
    val settings by viewModel.settings.collectAsState()
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Logo
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(Brush.linearGradient(listOf(GoldPrimary, GoldDark))),
            contentAlignment = Alignment.Center
        ) {
            if (settings.customLogoUri.isNotEmpty()) {
                AsyncImage(
                    model = settings.customLogoUri,
                    contentDescription = "Logo",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else {
                val logoIcon = when (settings.logoIndex) {
                    0 -> Icons.Default.Spa
                    1 -> Icons.Default.ContentCut
                    2 -> Icons.Default.Brush
                    3 -> Icons.Default.Face
                    4 -> Icons.Default.Palette
                    5 -> Icons.Default.AutoAwesome
                    else -> Icons.Default.Spa
                }
                Icon(
                    imageVector = logoIcon,
                    contentDescription = "Logo",
                    tint = CharcoalBg,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = settings.salonName.uppercase(),
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 2.sp,
                    color = GoldPrimary
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = TextMuted,
                    letterSpacing = 0.5.sp
                )
            )
        }
        
        if (actionButton != null) {
            Spacer(modifier = Modifier.width(12.dp))
            actionButton()
        }
    }
}


// ==========================================
// SCREEN 4: SYSTEM CONFIGURATION (SETTINGS)
// ==========================================
@Composable
fun SettingsTab(
    viewModel: SalonViewModel
) {
    val settings by viewModel.settings.collectAsState()
    val context = LocalContext.current

    var salonName by remember(settings) { mutableStateOf(settings.salonName) }
    var chosenLogoIndex by remember(settings) { mutableStateOf(settings.logoIndex) }
    var customLogoUriState by remember(settings) { mutableStateOf(settings.customLogoUri) }
    var reservationSubtitleState by remember(settings) { mutableStateOf(settings.reservationSubtitle) }
    var salonAddressState by remember(settings) { mutableStateOf(settings.salonAddress) }
    var workStartHour by remember(settings) { mutableStateOf(settings.workStartHour) }
    var workEndHour by remember(settings) { mutableStateOf(settings.workEndHour) }
    var bookingRangeState by remember(settings) { mutableStateOf(settings.bookingRangeDays) }
    var activeWorkDays by remember(settings) {
        mutableStateOf(
            settings.workDaysString.split(",").map { it.trim() }.filter { it.isNotEmpty() }.toSet()
        )
    }
    
    val logoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            customLogoUriState = uri.toString()
        }
    }
    
    val categoriesList = remember(settings.categoriesString) {
        settings.categoriesString.split(",").map { it.trim() }.filter { it.isNotEmpty() }
    }
    
    var newCategoryName by remember { mutableStateOf("") }
    var customBlockedSlotTime by remember { mutableStateOf("12:00") }

    val logos = listOf(
        Pair(Icons.Default.Spa, "Loto"),
        Pair(Icons.Default.ContentCut, "Cabello"),
        Pair(Icons.Default.Brush, "Maquillaje"),
        Pair(Icons.Default.Face, "Rostro"),
        Pair(Icons.Default.Palette, "Uñas"),
        Pair(Icons.Default.AutoAwesome, "Brillo")
    )

    // Visual list of 14 upcoming days to click block/unblock dynamically
    val upcomingDaysToBlock = remember {
        val days = mutableListOf<Date>()
        val cal = Calendar.getInstance()
        for (i in 0 until 14) {
            days.add(cal.time)
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        days
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(Brush.linearGradient(listOf(GoldPrimary, GoldDark)))
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Configuración",
                        tint = CharcoalBg,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "CONFIGURACIÓN",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 2.sp,
                            color = GoldPrimary
                        )
                    )
                    Text(
                        text = "Ajustes del Dueño del Negocio",
                        style = MaterialTheme.typography.bodyMedium.copy(color = TextMuted)
                    )
                }
            }
            Divider(
                color = CharcoalSurfaceVariant,
                thickness = 1.dp,
                modifier = Modifier.padding(top = 16.dp)
            )
        }

        // Color Presets configuration Section
        item {
            Text(
                text = "Colores de la Pantalla (Tema Visual)",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = GoldSecondary,
                    fontWeight = FontWeight.Bold
                ),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CharcoalSurface)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Selecciona un esquema de color para personalizar instantáneamente toda la aplicación:",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        SalonThemePreset.values().forEach { preset ->
                            val isSelected = settings.themeIndex == preset.id
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(52.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        if (isSelected) preset.primary.copy(alpha = 0.2f) else CharcoalBg
                                    )
                                    .border(
                                        width = if (isSelected) 3.dp else 1.dp,
                                        color = if (isSelected) preset.primary else CharcoalSurfaceVariant,
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                    .clickable {
                                        viewModel.updateSettings(
                                            salonName = settings.salonName,
                                            logoIndex = settings.logoIndex,
                                            categoriesString = settings.categoriesString,
                                            themeIndex = preset.id,
                                            workStartHour = settings.workStartHour,
                                            workEndHour = settings.workEndHour,
                                            blockedDates = settings.blockedDates,
                                            blockedSlots = settings.blockedSlots
                                        )
                                        Toast.makeText(context, "Color establecido: ${preset.title}", Toast.LENGTH_SHORT).show()
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(
                                        modifier = Modifier
                                            .size(16.dp)
                                            .clip(CircleShape)
                                            .background(preset.primary)
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = preset.title.split(" ").first(),
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = if (isSelected) TextLight else TextMuted,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Identities Card
        item {
            Text(
                text = "Identidad del Salón",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = GoldSecondary,
                    fontWeight = FontWeight.Bold
                ),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CharcoalSurface)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    OutlinedTextField(
                        value = salonName,
                        onValueChange = { salonName = it },
                        label = { Text("Nombre del Salón") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextLight,
                            unfocusedTextColor = TextLight,
                            focusedBorderColor = GoldPrimary,
                            unfocusedBorderColor = CharcoalSurfaceVariant,
                            cursorColor = GoldPrimary,
                            focusedLabelColor = GoldPrimary,
                            unfocusedLabelColor = TextMuted
                        ),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_salon_name")
                    )

                    OutlinedTextField(
                        value = reservationSubtitleState,
                        onValueChange = { reservationSubtitleState = it },
                        label = { Text("Título/Subtítulo de la Gestión de Reservas") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextLight,
                            unfocusedTextColor = TextLight,
                            focusedBorderColor = GoldPrimary,
                            unfocusedBorderColor = CharcoalSurfaceVariant,
                            cursorColor = GoldPrimary,
                            focusedLabelColor = GoldPrimary,
                            unfocusedLabelColor = TextMuted
                        ),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_reservation_subtitle")
                    )

                    OutlinedTextField(
                        value = salonAddressState,
                        onValueChange = { salonAddressState = it },
                        label = { Text("Dirección del Local") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextLight,
                            unfocusedTextColor = TextLight,
                            focusedBorderColor = GoldPrimary,
                            unfocusedBorderColor = CharcoalSurfaceVariant,
                            cursorColor = GoldPrimary,
                            focusedLabelColor = GoldPrimary,
                            unfocusedLabelColor = TextMuted
                        ),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("input_salon_address")
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Logo de Imagen Personalizado:",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextLight,
                            fontWeight = FontWeight.SemiBold
                        )
                    )

                    if (customLogoUriState.isNotEmpty()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(CharcoalBg, RoundedCornerShape(12.dp))
                                .border(1.dp, GoldPrimary.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AsyncImage(
                                model = customLogoUriState,
                                contentDescription = "Logo de imagen del salón",
                                modifier = Modifier
                                    .size(60.dp)
                                    .clip(CircleShape)
                                    .border(1.5.dp, GoldPrimary, CircleShape),
                                contentScale = ContentScale.Crop
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Logo de Foto Activo",
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        color = GoldPrimary,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                                Text(
                                    text = "Se mostrará esta imagen en el encabezado.",
                                    style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                                )
                            }
                            IconButton(
                                onClick = { customLogoUriState = "" },
                                colors = IconButtonDefaults.iconButtonColors(contentColor = MaterialTheme.colorScheme.error)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = "Eliminar logo")
                            }
                        }
                    } else {
                        Button(
                            onClick = { logoPickerLauncher.launch("image/*") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = CharcoalBg,
                                contentColor = GoldPrimary
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, GoldPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = GoldPrimary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Elegir Imagen/Foto para el Logo", fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "O elegir un ícono temático predefinido:",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextLight,
                            fontWeight = FontWeight.SemiBold
                        )
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        logos.forEachIndexed { index, (icon, label) ->
                            val isSelected = chosenLogoIndex == index && customLogoUriState.isEmpty()
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { 
                                        chosenLogoIndex = index 
                                        customLogoUriState = "" // Selecting preset clears custom image 
                                    }
                                    .background(
                                        color = if (isSelected) GoldPrimary.copy(alpha = 0.15f) else Color.Transparent,
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                    .border(
                                        width = if (isSelected) 2.dp else 1.dp,
                                        color = if (isSelected) GoldPrimary else CharcoalSurfaceVariant,
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                    .padding(vertical = 10.dp, horizontal = 4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = icon,
                                    contentDescription = label,
                                    tint = if (isSelected) GoldPrimary else TextMuted,
                                    modifier = Modifier.size(28.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = label,
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = if (isSelected) GoldPrimary else TextMuted,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                        fontSize = 11.sp
                                    ),
                                    textAlign = TextAlign.Center,
                                    maxLines = 1
                                )
                            }
                        }
                    }

                    Button(
                        onClick = {
                            if (salonName.isNotBlank()) {
                                viewModel.updateSettings(
                                    salonName = salonName,
                                    logoIndex = chosenLogoIndex,
                                    categoriesString = settings.categoriesString,
                                    themeIndex = settings.themeIndex,
                                    workStartHour = settings.workStartHour,
                                    workEndHour = settings.workEndHour,
                                    blockedDates = settings.blockedDates,
                                    blockedSlots = settings.blockedSlots,
                                    bookingRangeDays = settings.bookingRangeDays,
                                    workDaysString = settings.workDaysString,
                                    customLogoUri = customLogoUriState,
                                    reservationSubtitle = reservationSubtitleState,
                                    salonAddress = salonAddressState
                                )
                                Toast.makeText(context, "Identidad guardada con éxito", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(context, "Por favor ingrese un nombre para el salón", Toast.LENGTH_SHORT).show()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GoldPrimary,
                            contentColor = CharcoalBg
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("btn_save_identity")
                    ) {
                        Text("Guardar Identidad", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Operating Hours, Weekdays, and Range configuration section
        item {
            Text(
                text = "Horarios y Días de Operaciones",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = GoldSecondary,
                    fontWeight = FontWeight.Bold
                ),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CharcoalSurface)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "1. Límites Operativos Diarios (Formato 12 horas, Ej: 09:00 AM a 07:00 PM):",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = workStartHour,
                            onValueChange = { workStartHour = it },
                            label = { Text("Hora Apertura") },
                            placeholder = { Text("09:00 AM") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextLight,
                                unfocusedTextColor = TextLight,
                                focusedBorderColor = GoldPrimary,
                                unfocusedBorderColor = CharcoalSurfaceVariant,
                                cursorColor = GoldPrimary
                            ),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )

                        OutlinedTextField(
                            value = workEndHour,
                            onValueChange = { workEndHour = it },
                            label = { Text("Hora Cierre") },
                            placeholder = { Text("07:00 PM") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextLight,
                                unfocusedTextColor = TextLight,
                                focusedBorderColor = GoldPrimary,
                                unfocusedBorderColor = CharcoalSurfaceVariant,
                                cursorColor = GoldPrimary
                            ),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Divider(color = CharcoalSurfaceVariant, thickness = 1.dp)

                    Text(
                        text = "2. Días Laborables (Toca para activar/desactivar el día):",
                        style = MaterialTheme.typography.bodyMedium.copy(color = TextLight, fontWeight = FontWeight.Bold)
                    )

                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("Lunes", "Martes", "Miércoles", "Jueves").forEach { day ->
                                val isSelected = activeWorkDays.contains(day)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, if (isSelected) GoldPrimary else CharcoalSurfaceVariant, RoundedCornerShape(8.dp))
                                        .background(if (isSelected) GoldPrimary else CharcoalBg)
                                        .clickable {
                                            val updated = activeWorkDays.toMutableSet()
                                            if (isSelected) updated.remove(day) else updated.add(day)
                                            activeWorkDays = updated
                                        }
                                        .padding(vertical = 8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = day,
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = if (isSelected) CharcoalBg else TextLight,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                }
                            }
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("Viernes", "Sábado", "Domingo").forEach { day ->
                                val isSelected = activeWorkDays.contains(day)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, if (isSelected) GoldPrimary else CharcoalSurfaceVariant, RoundedCornerShape(8.dp))
                                        .background(if (isSelected) GoldPrimary else CharcoalBg)
                                        .clickable {
                                            val updated = activeWorkDays.toMutableSet()
                                            if (isSelected) updated.remove(day) else updated.add(day)
                                            activeWorkDays = updated
                                        }
                                        .padding(vertical = 8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = day,
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = if (isSelected) CharcoalBg else TextLight,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                }
                            }
                            Box(modifier = Modifier.weight(1f))
                        }
                    }

                    Divider(color = CharcoalSurfaceVariant, thickness = 1.dp)

                    Text(
                        text = "3. Rango Permitido de Reservas Futuras:",
                        style = MaterialTheme.typography.bodyMedium.copy(color = TextLight, fontWeight = FontWeight.Bold)
                    )
                    Text(
                        text = "Los clientes solo podrán agendar dentro de esta cantidad de días a partir de hoy:",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        IconButton(
                            onClick = { if (bookingRangeState > 1) bookingRangeState-- },
                            modifier = Modifier
                                .background(CharcoalBg, CircleShape)
                                .border(1.dp, CharcoalSurfaceVariant, CircleShape)
                                .size(36.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Remove, contentDescription = "Menos", tint = GoldPrimary)
                        }

                        Text(
                            text = "$bookingRangeState días",
                            style = MaterialTheme.typography.titleMedium.copy(color = TextLight, fontWeight = FontWeight.ExtraBold),
                            modifier = Modifier.padding(horizontal = 24.dp)
                        )

                        IconButton(
                            onClick = { if (bookingRangeState < 365) bookingRangeState++ },
                            modifier = Modifier
                                .background(CharcoalBg, CircleShape)
                                .border(1.dp, CharcoalSurfaceVariant, CircleShape)
                                .size(36.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Add, contentDescription = "Más", tint = GoldPrimary)
                        }
                    }

                    Button(
                        onClick = {
                            if (workStartHour.isNotBlank() && workEndHour.isNotBlank()) {
                                if (activeWorkDays.isEmpty()) {
                                    Toast.makeText(context, "Por favor active al menos un día de trabajo", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                viewModel.updateSettings(
                                    workStartHour = workStartHour,
                                    workEndHour = workEndHour,
                                    bookingRangeDays = bookingRangeState,
                                    workDaysString = activeWorkDays.joinToString(",")
                                )
                                Toast.makeText(context, "Horario, días laborables y rango de reservas actualizados con éxito", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(context, "Por favor ingrese horarios válidos", Toast.LENGTH_SHORT).show()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GoldPrimary,
                            contentColor = CharcoalBg
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Guardar Horario, Días y Rango", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Calendar Date / Hours Blocking Management Section (MANDATORY)
        item {
            Text(
                text = "Bloqueador de Calendario (Fechas & Horas)",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = GoldSecondary,
                    fontWeight = FontWeight.Bold
                ),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CharcoalSurface)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "1. Bloqueo Rápido de Días (Cierre/Feriado/Vacaciones)",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextLight,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Text(
                        text = "Toca un día de los próximos 14 días para cerrarlo temporalmente completando la fecha:",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                    )

                    val blockedDatesSet = remember(settings.blockedDates) {
                        settings.blockedDates.split(",").filter { it.isNotEmpty() }.toSet()
                    }

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(upcomingDaysToBlock) { date ->
                            val dayName = SimpleDateFormat("E", Locale("es", "ES")).format(date).uppercase()
                            val dayNum = SimpleDateFormat("dd", Locale("es", "ES")).format(date)
                            val dateStr = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(date)
                            val isBlocked = blockedDatesSet.contains(dateStr)

                            Card(
                                modifier = Modifier
                                    .width(62.dp)
                                    .height(82.dp)
                                    .clickable {
                                        val updatedSet = if (isBlocked) {
                                            blockedDatesSet - dateStr
                                        } else {
                                            blockedDatesSet + dateStr
                                        }
                                        viewModel.updateSettings(
                                            salonName = settings.salonName,
                                            logoIndex = settings.logoIndex,
                                            categoriesString = settings.categoriesString,
                                            themeIndex = settings.themeIndex,
                                            workStartHour = settings.workStartHour,
                                            workEndHour = settings.workEndHour,
                                            blockedDates = updatedSet.joinToString(","),
                                            blockedSlots = settings.blockedSlots
                                        )
                                        Toast
                                            .makeText(
                                                context,
                                                if (isBlocked) "Día habilitado" else "Día bloqueado temporalmente",
                                                Toast.LENGTH_SHORT
                                            )
                                            .show()
                                    }
                                    .border(
                                        width = if (isBlocked) 2.dp else 1.dp,
                                        color = if (isBlocked) MaterialTheme.colorScheme.error else CharcoalSurfaceVariant,
                                        shape = RoundedCornerShape(12.dp)
                                    ),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isBlocked) MaterialTheme.colorScheme.error.copy(alpha = 0.15f) else CharcoalBg
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Text(
                                        text = dayName,
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = if (isBlocked) MaterialTheme.colorScheme.error else TextMuted,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp
                                        )
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = dayNum,
                                        style = MaterialTheme.typography.titleLarge.copy(
                                            color = TextLight,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 18.sp
                                        )
                                    )
                                    if (isBlocked) {
                                        Icon(
                                            Icons.Default.Lock,
                                            contentDescription = "Cerrado",
                                            tint = MaterialTheme.colorScheme.error,
                                            modifier = Modifier.size(10.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Divider(color = CharcoalSurfaceVariant, thickness = 1.dp)

                    Text(
                        text = "2. Bloqueo de Horarios Específicos",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextLight,
                            fontWeight = FontWeight.Bold
                        )
                    )

                    Text(
                        text = "Selecciona un día en la lista de abajo y luego toca las horas para bloquearlas (Rojo) o habilitarlas (Disponible). El estado se guardará automáticamente:",
                        style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                    )

                    var selectedBlockDayStr by remember {
                        mutableStateOf(
                            SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(upcomingDaysToBlock.first())
                        )
                    }

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                    ) {
                        items(upcomingDaysToBlock) { date ->
                            val dayName = SimpleDateFormat("E", Locale("es")).format(date).uppercase()
                            val dayNum = SimpleDateFormat("dd", Locale("es")).format(date)
                            val dateStr = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(date)
                            val isChosen = selectedBlockDayStr == dateStr

                            Card(
                                modifier = Modifier
                                    .width(54.dp)
                                    .height(72.dp)
                                    .clickable { selectedBlockDayStr = dateStr }
                                    .border(
                                        width = if (isChosen) 2.dp else 1.dp,
                                        color = if (isChosen) GoldPrimary else CharcoalSurfaceVariant,
                                        shape = RoundedCornerShape(10.dp)
                                    ),
                                shape = RoundedCornerShape(10.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isChosen) GoldPrimary.copy(alpha = 0.15f) else CharcoalBg
                                )
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize().padding(2.dp),
                                    verticalArrangement = Arrangement.Center,
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = dayName,
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = if (isChosen) GoldPrimary else TextMuted,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 9.sp
                                        )
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = dayNum,
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            color = if (isChosen) GoldPrimary else TextLight,
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 14.sp
                                        )
                                    )
                                }
                            }
                        }
                    }

                    Divider(color = CharcoalSurfaceVariant, thickness = 1.dp)

                    val blockedSlotsList = remember(settings.blockedSlots) {
                        settings.blockedSlots.split(",").filter { it.isNotEmpty() }.toSet()
                    }

                    val slots = viewModel.availableTimeSlots

                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val chunks = slots.chunked(4) // 4 columns looks very nice and compact for 12-hour slots
                        chunks.forEach { rowSlots ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                rowSlots.forEach { slot ->
                                    val slotKey = "$selectedBlockDayStr-$slot"
                                    val isBlocked = blockedSlotsList.contains(slotKey)
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(44.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(if (isBlocked) MaterialTheme.colorScheme.error.copy(alpha = 0.2f) else CharcoalBg)
                                            .border(
                                                width = 1.dp,
                                                color = if (isBlocked) MaterialTheme.colorScheme.error else CharcoalSurfaceVariant,
                                                shape = RoundedCornerShape(10.dp)
                                            )
                                            .clickable {
                                                val updatedSlots = if (isBlocked) {
                                                    blockedSlotsList - slotKey
                                                } else {
                                                    blockedSlotsList + slotKey
                                                }
                                                viewModel.updateSettings(
                                                    blockedSlots = updatedSlots.joinToString(",")
                                                )
                                                Toast.makeText(
                                                    context,
                                                    if (isBlocked) "Hora habilitada para reserva" else "Hora bloqueada con éxito",
                                                    Toast.LENGTH_SHORT
                                                ).show()
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.Center,
                                            modifier = Modifier.padding(2.dp)
                                        ) {
                                            Icon(
                                                imageVector = if (isBlocked) Icons.Default.Lock else Icons.Default.Schedule,
                                                contentDescription = if (isBlocked) "Bloqueado" else "Disponible",
                                                tint = if (isBlocked) MaterialTheme.colorScheme.error else TextMuted,
                                                modifier = Modifier.size(10.dp)
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = slot,
                                                style = MaterialTheme.typography.bodySmall.copy(
                                                    color = if (isBlocked) MaterialTheme.colorScheme.error else TextLight,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 9.sp
                                                )
                                            )
                                        }
                                    }
                                }
                                if (rowSlots.size < 4) {
                                    repeat(4 - rowSlots.size) {
                                        Box(modifier = Modifier.weight(1f))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Categories Card
        item {
            Text(
                text = "Gestión de Categorías",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = GoldSecondary,
                    fontWeight = FontWeight.Bold
                ),
                modifier = Modifier.padding(bottom = 6.dp)
            )
            
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CharcoalSurface)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Categorías Activas:",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextLight,
                            fontWeight = FontWeight.SemiBold
                        )
                    )

                    FlowRow(mainAxisSpacing = 8.dp, crossAxisSpacing = 8.dp) {
                        categoriesList.forEach { cat ->
                            Row(
                                modifier = Modifier
                                    .background(CharcoalBg, RoundedCornerShape(8.dp))
                                    .border(1.dp, CharcoalSurfaceVariant, RoundedCornerShape(8.dp))
                                    .padding(start = 10.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                taxationLabelField(cat, settings, categoriesList, viewModel, context)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = newCategoryName,
                            onValueChange = { newCategoryName = it },
                            label = { Text("Nueva Categoría") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextLight,
                                unfocusedTextColor = TextLight,
                                focusedBorderColor = GoldPrimary,
                                unfocusedBorderColor = CharcoalSurfaceVariant,
                                cursorColor = GoldPrimary,
                                focusedLabelColor = GoldPrimary,
                                unfocusedLabelColor = TextMuted
                            ),
                            singleLine = true,
                            modifier = Modifier
                                .weight(1f)
                                .testTag("input_new_category")
                        )

                        IconButton(
                            onClick = {
                                val trimmed = newCategoryName.trim()
                                if (trimmed.isEmpty()) {
                                    Toast.makeText(context, "Ingrese un nombre válido", Toast.LENGTH_SHORT).show()
                                } else if (categoriesList.any { it.equals(trimmed, ignoreCase = true) }) {
                                    Toast.makeText(context, "Esa categoría ya existe", Toast.LENGTH_SHORT).show()
                                } else {
                                    val updated = (categoriesList + trimmed).joinToString(",")
                                    viewModel.updateSettings(
                                        salonName = settings.salonName,
                                        logoIndex = settings.logoIndex,
                                        categoriesString = updated,
                                        themeIndex = settings.themeIndex,
                                        workStartHour = settings.workStartHour,
                                        workEndHour = settings.workEndHour,
                                        blockedDates = settings.blockedDates,
                                        blockedSlots = settings.blockedSlots
                                    )
                                    newCategoryName = ""
                                    Toast.makeText(context, "Categoría agregada con éxito", Toast.LENGTH_SHORT).show()
                                }
                            },
                            colors = IconButtonDefaults.iconButtonColors(
                                containerColor = GoldPrimary,
                                contentColor = CharcoalBg
                            ),
                            modifier = Modifier
                                .size(48.dp)
                                .testTag("btn_add_category")
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Añadir Categoría")
                        }
                    }
                }
            }
        }
        
        item {
            Spacer(modifier = Modifier.height(40.dp))
        }
    }
}

@Composable
fun RowScope.taxationLabelField(
    cat: String,
    settings: com.example.data.SalonSettings,
    categoriesList: List<String>,
    viewModel: SalonViewModel,
    context: Context
) {
    Text(
        text = cat,
        style = MaterialTheme.typography.bodySmall.copy(
            color = TextLight,
            fontWeight = FontWeight.Bold
        )
    )
    IconButton(
        onClick = {
            if (categoriesList.size <= 1) {
                Toast.makeText(context, "Debe tener al menos una categoría activa.", Toast.LENGTH_SHORT).show()
            } else {
                val remaining = categoriesList.filter { it != cat }.joinToString(",")
                viewModel.updateSettings(
                    salonName = settings.salonName,
                    logoIndex = settings.logoIndex,
                    categoriesString = remaining,
                    themeIndex = settings.themeIndex,
                    workStartHour = settings.workStartHour,
                    workEndHour = settings.workEndHour,
                    blockedDates = settings.blockedDates,
                    blockedSlots = settings.blockedSlots
                )
                Toast.makeText(context, "Categoría eliminada", Toast.LENGTH_SHORT).show()
            }
        },
        modifier = Modifier.size(24.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Close,
            contentDescription = "Eliminar de catálogo",
            tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f),
            modifier = Modifier.size(12.dp)
        )
    }
}

