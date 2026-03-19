import multiprocessing
from srtgo.__main__ import srtgo

if __name__ == "__main__":
    multiprocessing.freeze_support()
    srtgo()