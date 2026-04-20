import asyncio
import logging
from app.services.data_blender import global_event_generator

async def test_generator():
    print("Starting generator test...")
    try:
        async for event in global_event_generator():
            print("Successfully yielded event:")
            print(event)
            break
    except Exception as e:
        print("Generator crashed:", e)
        logging.exception("Detailed error:")

if __name__ == "__main__":
    asyncio.run(test_generator())
