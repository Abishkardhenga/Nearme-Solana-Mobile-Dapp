import "../src/polyfills"


global.Buffer = require("buffer").Buffer




import { Slot } from "expo-router"
import { QueryProvider } from "@/providers/QueryProvider"
import { AuthProvider } from "@/providers/AuthProvider"
import { ThemeProvider } from "@/providers/ThemeProvider"
import { NavigationGuard } from "@/providers/NavigationGuard"
import "../global.css"

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <NavigationGuard>
            <Slot />
          </NavigationGuard>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
