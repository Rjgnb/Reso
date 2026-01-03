import webview
from api import GoAPI
from KataGoApi import KataGoEngine
import os

if __name__ == "__main__":
    api = GoAPI(KataGoEngine())
    win = webview.create_window(
        "Go Pro",
        "assets/index.html",
        js_api=api,
        width=1600,
        height=1050
    )
    api.setWindow(win)
    webview.start()
