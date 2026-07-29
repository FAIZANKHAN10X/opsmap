"""Background job callables.

Individual async jobs (image resize, email, reports, etc.) live here.
Workers under ``app.workers`` schedule and execute these tasks via RQ.
"""
