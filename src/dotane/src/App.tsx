import { Provider } from "jotai"
import { ThemeProvider } from "@/components/theme-provider"
import NoteApp from "./NoteApp"

function App() {
  return (
    <Provider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <NoteApp />
      </ThemeProvider>
    </Provider>
  )
}

export default App 