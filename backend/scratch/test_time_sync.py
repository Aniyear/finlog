import sys
from datetime import datetime
import os

# Mock the environment or add to path
sys.path.append(os.getcwd())

from app.application.receipt_parser_service import ReceiptParserService
from app.infrastructure.config import APP_TZ

def test_time_sync():
    test_cases = [
        "09.01.2026 15:03",
        "10-02-2026 09:25:44",
    ]
    
    print(f"Application TZ: {APP_TZ}")
    
    for tc in test_cases:
        raw, dt = ReceiptParserService._parse_datetime_str(tc)
        print(f"Input: {tc}")
        print(f"Parsed datetime: {dt} (tz={dt.tzinfo})")
        
        # Verify it matches exactly and is aware
        expected_hour = int(tc.split()[1].split(":")[0])
        if dt.hour == expected_hour and dt.tzinfo == APP_TZ:
            print("✅ SUCCESS: Time matches and is aware.")
        else:
            print(f"❌ FAILURE: Got {dt.hour} instead of {expected_hour} or wrong tz.")

if __name__ == "__main__":
    test_time_sync()
