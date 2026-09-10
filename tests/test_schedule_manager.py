"""Tests for schedule_manager.ScheduleManager."""
from datetime import datetime

from custom_components.intelligent_heating_control.schedule_manager import ScheduleManager

# 2024-01-01 was a Monday.
MONDAY = datetime(2024, 1, 1)
TUESDAY = datetime(2024, 1, 2)
SATURDAY = datetime(2024, 1, 6)

WEEKDAY_SCHEDULE = [
    {
        "days": ["mon", "tue", "wed", "thu", "fri"],
        "periods": [
            {"start": "06:30", "end": "08:00", "temperature": 22.0, "offset": 0.0},
            {"start": "17:00", "end": "22:00", "temperature": 21.0, "offset": 0.5},
        ],
    },
    {
        "days": ["sat", "sun"],
        "periods": [
            {"start": "08:00", "end": "23:00", "temperature": 21.5, "offset": 0.0},
        ],
    },
]

OVERNIGHT_SCHEDULE = [
    {
        "days": ["mon"],
        "periods": [
            {"start": "22:00", "end": "06:00", "temperature": 18.0, "offset": 0.0},
        ],
    },
]


def test_active_period_found_within_range():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    now = MONDAY.replace(hour=7, minute=0)
    active = mgr.get_active_period(now)
    assert active is not None
    assert active["temperature"] == 22.0


def test_no_active_period_outside_ranges():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    now = MONDAY.replace(hour=12, minute=0)
    assert mgr.get_active_period(now) is None


def test_active_period_respects_weekday():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    now = SATURDAY.replace(hour=7, minute=0)  # weekday period, but it's Saturday
    assert mgr.get_active_period(now) is None
    now = SATURDAY.replace(hour=10, minute=0)  # weekend period
    active = mgr.get_active_period(now)
    assert active is not None
    assert active["temperature"] == 21.5


def test_overnight_period_active_before_midnight():
    mgr = ScheduleManager(OVERNIGHT_SCHEDULE)
    now = MONDAY.replace(hour=23, minute=0)
    active = mgr.get_active_period(now)
    assert active is not None
    assert active["temperature"] == 18.0


def test_overnight_period_active_after_midnight_still_matches_start_day():
    # 00:30 on the same weekday the period *starts* (Monday 22:00-06:00) - the
    # period is attached to "mon" so it must also match at 00:30 on Monday
    # itself (the schedule's mental model is "the overnight block that begins
    # on this weekday").
    mgr = ScheduleManager(OVERNIGHT_SCHEDULE)
    now = MONDAY.replace(hour=0, minute=30)
    active = mgr.get_active_period(now)
    assert active is not None
    assert active["temperature"] == 18.0


def test_upcoming_period_within_window():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    now = MONDAY.replace(hour=6, minute=15)  # 15 min before 06:30 start
    upcoming = mgr.get_upcoming_period(within_minutes=30, now=now)
    assert upcoming is not None
    assert upcoming["temperature"] == 22.0


def test_upcoming_period_outside_window_returns_none():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    now = MONDAY.replace(hour=5, minute=0)  # 90 min before 06:30 start
    assert mgr.get_upcoming_period(within_minutes=30, now=now) is None


def test_upcoming_period_crossing_midnight_checks_next_day():
    # A period starting just after midnight on Monday must be found from
    # late Sunday night, i.e. the lookup has to cross the weekday boundary.
    early_monday_schedule = [
        {"days": ["mon"], "periods": [{"start": "00:05", "end": "06:00", "temperature": 19.0}]},
    ]
    mgr = ScheduleManager(early_monday_schedule)
    sunday_late = datetime(2023, 12, 31, 23, 50)  # 15 minutes before 00:05 Monday
    upcoming = mgr.get_upcoming_period(within_minutes=20, now=sunday_late)
    assert upcoming is not None
    assert upcoming["temperature"] == 19.0


def test_next_period_skips_already_passed_periods_today():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    now = MONDAY.replace(hour=9, minute=0)  # after the 06:30-08:00 block
    nxt = mgr.get_next_period(now)
    assert nxt is not None
    assert nxt["start"] == "17:00"


def test_next_period_looks_ahead_to_the_following_day():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    now = SATURDAY.replace(hour=23, minute=30)  # after Saturday's block ends
    nxt = mgr.get_next_period(now)
    assert nxt is not None
    # Sunday's weekend block (same schedule entry, "sat"+"sun") is the very
    # next calendar occurrence - it comes before Monday's morning block.
    assert nxt["start"] == "08:00"
    assert nxt["temperature"] == 21.5


def test_next_period_wraps_to_following_week_when_nothing_left():
    # Only a Monday-morning period exists - from Monday evening the only
    # candidate is next Monday's occurrence, seven days later.
    monday_only_schedule = [
        {"days": ["mon"], "periods": [{"start": "06:30", "end": "08:00", "temperature": 22.0}]},
    ]
    mgr = ScheduleManager(monday_only_schedule)
    now = MONDAY.replace(hour=23, minute=30)
    nxt = mgr.get_next_period(now)
    assert nxt is not None
    assert nxt["start"] == "06:30"


def test_active_period_end_minutes_same_day():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    now = MONDAY.replace(hour=7, minute=30)  # 30 min before 08:00 end
    assert mgr.get_active_period_end_minutes(now) == 30.0


def test_active_period_end_minutes_overnight_wraps():
    mgr = ScheduleManager(OVERNIGHT_SCHEDULE)
    now = MONDAY.replace(hour=23, minute=0)  # 7h before 06:00 end
    assert mgr.get_active_period_end_minutes(now) == 7 * 60


def test_active_period_end_minutes_none_when_inactive():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    now = MONDAY.replace(hour=12, minute=0)
    assert mgr.get_active_period_end_minutes(now) is None


def test_update_schedules_replaces_state():
    mgr = ScheduleManager(WEEKDAY_SCHEDULE)
    mgr.update_schedules(OVERNIGHT_SCHEDULE)
    assert mgr.schedules == OVERNIGHT_SCHEDULE
