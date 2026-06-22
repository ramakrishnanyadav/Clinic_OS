# ClinicFlow OS

## The Five Core Features — Each Directly Tied to a Judging Criterion

1. **Multi-doctor registration + duplicate guard**: Add patient in <10 seconds.
2. **Socket.IO multi-room broadcast**: Live updates without refresh.
3. **Delay-aware rolling average engine**: Wait time from real data.
4. **Returning patient autofill + duplicate warning**: Receptionist speed and accuracy.
5. **Emergency injection + queue state recovery**: Concurrency and edge cases.

## System Architecture

```text
  RECEPTIONIST         EXPRESS.JS SERVER              PATIENT SCREEN
  /reception                                          /waiting

      │                      │                             │
      │──── WebSocket ───────►│◄──── WebSocket ─────────────│
      │                      │                             │
      │  POST /patients       │  ┌─────────────────────┐   │
      │──────────────────────►│  │  Wait Time Engine   │   │
      │◄── { token: GP-51 } ──│  │  rollingAvg × ahead │   │
      │                      │  └─────────────────────┘   │
      │                      │                             │
      │  PATCH /call-next     │  ┌─────────────────────┐   │
      │──────────────────────►│  │  Delay Detector     │   │
      │                      │  │  every 30 seconds   │   │
      │                      │  └─────────────────────┘   │
      │                      │                             │
      │                      │──broadcast queue:next_called►│
      │◄─broadcast ───────────│   { current: GP-23,        │
      │  queue:next_called    │     waitList updated }      │
      │                      │                             │
      │                      │       MONGODB               │
      │                      │  ┌──────────────────────┐   │
      │                      │  │ queues  patients     │   │
      │                      │  │ stats   snapshots    │   │
      │                      │  └──────────────────────┘   │
      │                      │                             │
  [server restart]           │                             │
      │                      │── load recoverySnapshot     │
      │                      │── hydrate queue state       │
      │◄── queue:state_update─│──────────────────────────►│
      │   (full restore)     │   (full restore)            │
```

MongoDB handles the persistence. Express handles the APIs. Socket.IO broadcasts the live state to specific rooms.

## Start the App

1. Ensure MongoDB is running or configure `MONGO_URI` in `.env`.
2. Run `npm install`
3. Run `node server/index.js`
