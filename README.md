# 五子棋

canvas和dom双版本实现，在不支持canvas时回退为dom版本。
目前实现了判定胜负、悔棋和撤销悔棋功能。
人机对战待开发。。。

### 初始化:

```js
new FiveChess(parameters);
```
**parameters**是一个传递初始化参数的对象。

```js
//example
var myIce = new FiveChess({
       'containId': '#myId'，
       'backId': '#backBtn'
   });
```

### parameters

参数     |   类型  |     默认    |                        描述
------- | ------- | ---------- | -------------------------------------------------
width  | number | 480 | 指定棋盘大小，单位是px。参数不能小于35， 如果小于，使用默认值。会绘制成标准的15*15棋盘
containId | string | null | 必须。容器的id
backId | string | null | 触发悔棋的元素id
revokeBackId | string | null | 触发撤销悔棋的元素id
restartId  | string | null | 触发重新开始的元素id
winCallback  | function | null | 判定胜利的回调函数，会传入一个布尔值，true表示先手赢，false表示后手赢
bcolor  |  string | black | 先手棋子的颜色
wcolor | string | #dbdede | 后手棋子的颜色

