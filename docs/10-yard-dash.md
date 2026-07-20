# 10-yard dash scoring

FAI records two 10-yard dash attempts for every athlete and keeps the best valid time.

- OL and DL: the best 10-yard dash is graded against the BIG position profile and included as a Speed metric.
- All other position groups: the time is stored and can appear in available-data views, but it receives no normalized score and does not change Speed or FAI.
- The metric is optional, so older testing events and athletes without a 10-yard dash keep their existing completion status.
- Current OL/DL benchmark range: 1.70 seconds = 100; 2.25 seconds = 0; values between are scaled linearly and clamped to 0–100.
