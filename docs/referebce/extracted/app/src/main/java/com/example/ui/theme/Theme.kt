package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
  darkColorScheme(
    primary = StaticGoldPrimary,
    secondary = StaticGoldSecondary,
    tertiary = BlushAccent,
    background = CharcoalBg,
    surface = CharcoalSurface,
    onBackground = OnCharcoalBg,
    onSurface = OnCharcoalBg,
    surfaceVariant = CharcoalSurfaceVariant,
    onPrimary = CharcoalBg,
    onSecondary = CharcoalBg
  )

private val LightColorScheme =
  lightColorScheme(
    primary = StaticGoldPrimary,
    secondary = StaticGoldSecondary,
    tertiary = BlushAccent,
    background = CharcoalBg, // Keep consistent luxurious theme irrespective of system style
    surface = CharcoalSurface,
    onBackground = OnCharcoalBg,
    onSurface = OnCharcoalBg,
    surfaceVariant = CharcoalSurfaceVariant,
    onPrimary = CharcoalBg,
    onSecondary = CharcoalBg
  )

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  // Disable dynamic color to strictly guarantee aesthetic brand identity consistency
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
