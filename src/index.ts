import { Hono } from "hono"
import { streamSSE } from "hono/streaming"

const app = new Hono()

interface TimeAPIResponse {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  seconds: number
  milliSeconds: number
  dateTime: string
  date: string
  time: string
  timeZone: string
  dayOfWeek: string
  dstActive: boolean
}

async function getNTPTime(): Promise<Date> {
  const url = "https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Tokyo"
  const response = await fetch(url)
  const data = await response.json() as TimeAPIResponse
  return new Date(data.dateTime)
}

function getSignalPattern(seconds: number): string {
  const lastDigit = seconds.toString().slice(-1)
  if (lastDigit === "0") return "Poon"
  if (lastDigit >= "7" && lastDigit <= "9") return "Pu"
  return "Pi"
}

app.get("/", async (c) => {
  const initialTime = await getNTPTime()
  const timeOffset = initialTime.getTime() - Date.now()

  c.header("Content-Type", "text/event-stream; charset=utf-8")
  c.header("Access-Control-Allow-Origin", "*")

  return streamSSE(c, async (stream) => {
    while (true) {
      const correctedTime = new Date(Date.now() + timeOffset)
      const seconds = correctedTime.getSeconds()
      const signal = getSignalPattern(seconds)

      await stream.writeSSE({
        data: JSON.stringify({
          time: correctedTime.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          signal: signal
        }),
        event: "time-update",
      })

      await stream.sleep(1000)
    }
  })
})

export default app
