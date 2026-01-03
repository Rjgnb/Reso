import json
import time

from sympy import false
import AiAnalysis
from KataGoCmd import KataGoCmd


boardCLine = {
    'A' : 0,
    'B' : 1,
    'C' : 2,
    'D' : 3,
    'E' : 4,
    'F' : 5,
    'G' : 6,
    'H' : 7,
    'J' : 8,
    'K' : 9,
    'L' : 10,
    'M' : 11,
    'N' : 12,
    'o' : 13,
    'P' : 14,
    'Q' : 15,
    'R' : 16,
    'S' : 17,
    'T' : 18
}


colorList = ['b','w'] # 0 1 ======== 1 2
def getColor(color):

    return colorList[color-1]
def getNextColor(color):
    return colorList[color%2]  #

def translatedPointFromRCToGTP(r,c):
    reverse_boardCLine = {value: key for key, value in boardCLine.items()}
    s = ""
    s += reverse_boardCLine[c]
    s += str(19 - r)
    return s

def translatedPointFromGTPToRC(s):
    r = 19 - int(s[1:])
    c = boardCLine[s[0]]
    return r,c

class KataGoEngine:
    def __init__(self):
        self.board = [[0]*19 for _ in range(19)]
        self.KataGoCmd = KataGoCmd()
       # self.isreading = False

    def humPlay(self,r,c,color,board):
        #while self.isreading:
            #time.sleep(0.001)

       # self.isreading = True
        cmd = f"play {getColor(color)} {translatedPointFromRCToGTP(r,c)}"
        result = self.KataGoCmd.send_cmd(cmd)[0]
        #self.isreading = false
        return print("humPlay read:" + result)
    def gen_move(self, r, c, color):
      #  while self.isreading:
         #   time.sleep(0.001)
        if not r == -1 and c == -1:
            self.board[r][c] = color

       # self.isreading = True
        cmd = f"genmove {getNextColor(color)}"
        res = self.KataGoCmd.send_cmd(cmd)
        #self.isreading = False

        repaid = res[0].partition('= ')[2]

        if repaid == 'resign':
            return 66,66
        elif repaid == 'pass':
            return -1,-1
        ai_r,ai_c = translatedPointFromGTPToRC(repaid)
        self.board[ai_r][ai_c] = (color%2)
        return ai_r,ai_c

    def undo(self, board):
        cmd = f"undo"
        self.KataGoCmd.send_cmd(cmd)
        return True

    def reset(self):
        cmd = f"clear_board"
        send = self.KataGoCmd.send_cmd(cmd)
        return send
    def analyze(self,lastR,lastC,opponent, board):
        query  = "你是一位深谙棋道的国手棋待诏，正在指点一位天资聪颖的天子下棋。我已为你完成局面解析，以下是确切的棋盘信息：- 棋盘十九路，坐标（从左到右A-T列无I ;从下到上1-19行.如D16在第4行第4列,在棋盘左上星位;Q4在棋盘右下星位）**："

        black = "黑棋:"
        white = "白棋:"
        for r in range(0,19):
            for c in range(0,19):
                if board[r][c] == 1:
                    p = translatedPointFromRCToGTP(r,c)
                    black += p + " "
                elif board[r][c] == 2:
                    p = translatedPointFromRCToGTP(r,c)
                    white += p + " "
        last = translatedPointFromRCToGTP(lastR,lastC)

        info = f"{black}\n{white} \n 最新一手{last}\n对手{opponent}\n"
        query = query + "\n" + info + "\n\n**你的任务（请直接开始以下分析）：用一两句话点明当前局面的焦点和双方形势。给出你认为最好的1-3个落子点，并分别用口语解释这手棋的目的（是攻击、防守、还是围空等各种方式？）。针对你首选的落子点，简单推演白棋最可能的应对（1-2步即可）。 **总结**：用一句总结性的话告诉棋手，这手棋好在哪里。天子已摆出一局棋，请你审视局面，用通透的口语为他讲解，言辞间要有古风意韵，但道理要讲得明白。"
        return AiAnalysis.analyze(query)


    def sync_board(self, board):
        self.board = board

    def updateScore_(self):
        cmd = f"final_score"
        score = {"score":self.KataGoCmd.send_cmd(cmd)[0].partition('= ')[2]}
        return json.dumps(score)

