import weakref

from KataGoApi import KataGoEngine


class GoAPI:
    def __init__(self, ai_engine):
        self._window_ref = None
        self.ai = ai_engine

    def on_play(self,r,c,color,board):
        self.ai.humPlay(r,c,color,board)
        self.updateScore()
        return True
    def on_genmove(self, r, c, color, board):
        ai_r, ai_c = self.ai.gen_move(r,c,color)
        self.updateScore()
        return {
            "ai_move": {"r": ai_r, "c": ai_c},
            "log": "AI 已落子"
        }

    def analysis(self, lastR,lastC,opponent, board):
        return self.ai.analyze(lastR,lastC,opponent, board)

    def undo(self, board):
        self.ai.undo(board)
        return {"msg": "已同步悔棋"}

    def reset(self):
        self.ai.reset()
        return {"log":"已新开一局"}

    def setRank(self,rank):
        self.ai.setRank(rank)
        return {"log":""}

    def setWindow(self,win):
        self._window_ref = weakref.ref(win)


    def updateScore(self):
        score_json = self.ai.updateScore_()
        js_code = f'window.fromPython.updateScore({score_json})'
        if self._window_ref is not None:
            window = self._window_ref()
            if window is not None:
                window.evaluate_js(js_code)


