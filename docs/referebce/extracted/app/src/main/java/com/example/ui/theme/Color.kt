package com.example.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

val CharcoalBg = Color(0xFF121214)
val CharcoalSurface = Color(0xFF1C1C1F)
val CharcoalSurfaceVariant = Color(0xFF28282C)

val BlushAccent = Color(0xFFF7D1CD)

val OnCharcoalBg = Color(0xFFEAEAEA)
val TextLight = Color(0xFFFBFBFB)
val TextMuted = Color(0xFF90909A)
val HighlightSucceed = Color(0xFF4CAF50)

val StaticGoldPrimary = Color(0xFFD4AF37)
val StaticGoldSecondary = Color(0xFFE5C158)
val StaticGoldDark = Color(0xFFA67C00)

val LocalThemePrimary = staticCompositionLocalOf { StaticGoldPrimary }
val LocalThemeSecondary = staticCompositionLocalOf { StaticGoldSecondary }
val LocalThemeDark = staticCompositionLocalOf { StaticGoldDark }

val GoldPrimary: Color @Composable get() = LocalThemePrimary.current
val GoldSecondary: Color @Composable get() = LocalThemeSecondary.current
val GoldDark: Color @Composable get() = LocalThemeDark.current
