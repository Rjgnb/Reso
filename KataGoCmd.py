import sys

import subprocess
import time

from sympy import false


class KataGoCmd(object):

    #F:\KaTrain\_internal\katrain\KataGo\katago.exe gtp -config F:\KaTrain\_internal\katrain\KataGo\genconfig.cfg -model F:\KaTrain\_internal\katrain\models\kata1-b18c384nbt-s9996604416-d4316597426.bin.gz
    def __init__(self, katago_path = R".\KataGo\katago.exe",
                 config_path = R".\KataGo\test.cfg",
                 model_path = R".\models\kata1-b18c384nbt-s9996604416-d4316597426.bin.gz",
                 human_model = R".\models\b18c384nbt-humanv0.bin.gz",
                 additional_args=None):
        if additional_args is None:
            additional_args = []
        self.query_counter = 0
        katago = subprocess.Popen(
            [katago_path, "gtp", "-config", config_path, "-model", model_path, "-human-model",human_model,*additional_args],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        self.katago = katago
        self.isreading = False

        self.test_connection()

        self.board = [[0 for _ in range(19)] for _ in range(19)]  # 0:未下 1:黑 2:白

        print(f"KataGo 配置成功 \nKataGO_path: {katago_path} \nModel:{model_path}\nconfig:{config_path}\nadditional_args:{additional_args}")

    def read_cmd(self):
        lines = []
        for _ in range(100):  # 最多读取100行
            line = self.katago.stdout.readline()
            if line == '\n':
                break
            else:
                print("Kata --->>   py  :".format(20) + f"{line}")
            lines.append(line.strip())

        return lines

    def send_cmd(self,cmd):
        while self.isreading:
            time.sleep(0.001)
        self.isreading = True
        self.katago.stdin.write(cmd + "\n")
        self.katago.stdin.flush()
        print("py   --->> Kata  :".format(20) + f"{cmd}")
        result = self.read_cmd()
        self.isreading = False
        return result


    def test_connection(self):
        # 测试连接
        try:
            self.send_cmd("version")  # 应该返回版本号
            #self.send_cmd("board-size 19")  # 设置棋盘大小
            self.send_cmd("clear_board")  # 清空棋盘
            #self.send_cmd("komi 7.5")  # 设置贴目（可选）
        except Exception as e:
            print("KataGo 启动失败或命令错误:", e)
            self.katago.kill()
            sys.exit(1)




def main():
    katago = KataGoCmd()
    katago.send_cmd("genmove b")
if __name__ == "__main__":
    main()