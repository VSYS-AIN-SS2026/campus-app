create unique index if not exists lsf_events_module_date_room_unique
  on lsf_events(module_id, start_date, start_time, room_building, room_number);
