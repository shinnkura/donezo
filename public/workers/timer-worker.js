let timerId = null
let timeRemaining = 0
let isPaused = false
let startTime = null

self.onmessage = function(e) {
  const { type, duration } = e.data

  switch (type) {
    case 'start':
      timeRemaining = duration
      startTime = Date.now()
      isPaused = false
      startTimer()
      break

    case 'pause':
      isPaused = true
      if (timerId) {
        clearInterval(timerId)
        timerId = null
      }
      break

    case 'resume':
      if (isPaused) {
        isPaused = false
        startTime = Date.now()
        timeRemaining = duration || timeRemaining
        startTimer()
      }
      break

    case 'reset':
      if (timerId) {
        clearInterval(timerId)
        timerId = null
      }
      timeRemaining = 0
      isPaused = false
      break
  }
}

function startTimer() {
  if (timerId) {
    clearInterval(timerId)
  }

  timerId = setInterval(() => {
    if (!isPaused) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const newTimeRemaining = Math.max(0, timeRemaining - elapsed)

      self.postMessage({
        type: 'tick',
        timeRemaining: newTimeRemaining
      })

      if (newTimeRemaining <= 0) {
        clearInterval(timerId)
        timerId = null
        self.postMessage({
          type: 'complete'
        })
      } else {
        // Update for next tick
        timeRemaining = newTimeRemaining
        startTime = Date.now()
      }
    }
  }, 100) // Update every 100ms for smooth display
}