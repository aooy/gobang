# 五子棋

canvas和dom双版本实现，在不支持canvas时回退为dom版本。
实现了判定胜负、悔棋、撤销悔棋和人机对战。

我让电脑走的白棋，五子棋没禁手的话，先手有优势。目前我和电脑下的话，做为qq五子棋二段选手（很菜。。）有时不注意会被它赢。

# 在线demo
[点这里](https://aooy.github.io/gobang/)

### 初始化:

```js
new FiveChess(parameters).init();
```
**parameters**是一个传递初始化参数的对象。

```js
//example
var chess = new FiveChess({
       'width': 320,
       'containId': '#myId'，
       'backId': '#backBtn'
   });
chess.init();
```
### init 方法
执行棋盘初始化。

### parameters

参数     |   类型  |     默认    |                        描述
------- | ------- | ---------- | -------------------------------------------------
width  | number | 480 | 指定棋盘大小，单位是px。参数不能小于32， 如果小于，使用默认值。会绘制成标准的15*15棋盘,所以横竖各有16格，设定的宽度尽量取16的倍数，默认向下取整，如果不是16的倍数，绘制的棋盘会比设定值稍小。
containId | string | null | 必须。容器的id
useDom | boolean | false | 默认是使用canvas版的,不支持canvas才使用dom。但是如果想使用dom版本，也可以设置该值为true
backId | string | null | 触发悔棋的元素id
revokeBackId | string | null | 触发撤销悔棋的元素id
restartId  | string | null | 触发重新开始的元素id
winCallback  | function | null | 判定胜利的回调函数，会传入一个布尔值，true表示先手赢，false表示后手赢
bcolor  |  string | black | 先手棋子的颜色
wcolor | string | #dbdede | 后手棋子的颜色

# 思考过程

### 基本思路
五子棋的实现基本就两种，一种用canvas，一种用dom。dom的兼容性比canvas好，“优雅降级”的思路是不支持canvas时则使用dom。

两种显示方法看起来实现完全不同， 但是他们有一个很大的交集就是数据，数据是共用的，不同的只是绘画方法。

### 基本结构
OOP思想在这里就很适合。

基本结构如下：
```js
//五子棋对象
function FiveChess (option) { 
    //初始化数据
    this.width = option.width;
    ...
 }
 FiveChess.prototype = {
    //canvas的方法
    canvasFn: function () {
      ...
    },
    //dom的方法
    domFn: function () {
      ...
    },
    ...
 }
 
```
对象调用不同的方法，就会得到不同的结果。

## 棋盘与落子层独立

如果有精美的棋盘、棋子图片，直接拿来当背景是最方便的。但要考虑棋盘尺寸和图片大小，避免图片的拉伸模糊等问题。这里没有用图片，而是自己画棋盘。

### canvas

使用了两层canvas

```js
<div>
  //绘制棋盘的canvas
  <canvas></canvas>
  
  //绘制棋子的canvas,完全重叠在棋盘canvas上
  <canvas></canvas> 
<div>
```
因为我们有悔棋功能，意味着需要清理画布，如果只用一个canvas，悔棋需要清理整个画布然后重绘。如果落子单独用一个canvas,悔棋只需要清理那颗子的位置就可以了。

### dom

dom的实现比canvas简单很多，棋盘直接用表格，棋子定位到对应的位置即可。

```js
<div>
  //绘制棋盘的table
  <table>
  <tr><td></td>...</tr>
  ...
  </table>
  
  //绘制棋子的div
  <div></div>
  ...
<div>
```

## 降级判定

需要去根据支持情况，选择合适的方法。
```js
//辅助函数
 helper: {
  //检测是否支持canvas
  supportCav: (function () {
   var cav = document.createElement('canvas');
   //return false;
   return !!cav.getContext;
  })(),
  //是否支持Transforms3d
  supportTransforms3d : (function () {
            var div = document.createElement('div').style;
            return ('webkitPerspective' in div || 'MozPerspective' in div || 'OPerspective' in div || 'MsPerspective' in div || 'perspective' in div);
   })()
 },
```

知道了支持情况，就可以调用对应的方法了。

例如：
```js
//绘制棋盘
drawBg: function (cxt, width, space) {
  //支持canvas， 用canvas绘制棋盘
  if(this.helper.supportCav){
   ....
  }else{
   //不支持则用dom绘制棋盘
   ...
  }
},
```


## 落子位置判定

使用 **getBoundingClientRect()** 方法可以取得棋盘相对视口的位置，与点击事件的**clientX/Y**做差，就可以得出点击位置相对棋盘的偏移量，再做相应计算得出落子的位置。

## 悔棋、撤销悔棋功能

存储数据：
```js
//存储棋子的位置数据
this.allStore = {};
/**
  记录每次落子的action,便于回溯,每3个数据为一次action,
  格式为[color, x, y, color, x, y ....]
*/
this.action = [];
//如果是dom版本的，会把每一步的棋子dom，存进去actionDom
this.actionDom = [];
//记录悔了几步棋
this.backActionNum = 0;
```

实现悔棋，需要将每一步记录下来，使用的是一个数组，调用**slice**就可以取对应的数据，因为数据简单，所以 **[color, x, y, color, x, y ....]** 这样的数据格式就满足需求了，如果数据量复杂，还是用对象比较方便，就像这样 **[{...},{...}...]** 。


### 删子
悔棋意味着要删子，就是从**this.action**取出的对应数据执行相应操作。

#### canvas：
知道位子信息，调用**clearRect** 即可清理对应的画布。
```js
this.cavchessCxt.clearRect(x, y, witdh, height);
```
#### dom：
**this.actionDom = []** 这个数组是存储棋子dom的，悔棋取出最后一个删掉即可。
```js
this.wrap.removeChild(this.actionDom.pop());
```

完整的代码：
```js
 //删子代码
clearChress: function (x, y, witdh, height) {
  if(this.helper.supportCav){
   this.cavchessCxt.clearRect(x, y, witdh, height);
  }else{
   this.wrap.removeChild(this.actionDom.pop());
  }
 }
```

### 撤销悔棋
**this.backActionNum** 属性是存储悔棋步数的，并且在悔棋、撤销悔棋的过程中，只要不做落子操作，**this.action**里的数据是不变的，只有等待落子后，才会根据悔棋步数增删**this.action**的数据。所以撤销悔棋也只是依据悔棋步数找到对应棋子的信息，把它添加回来就好了。


## 胜负判定

感觉较为合适的算法就是判断最后一颗子的四个方位（横、竖、斜、反斜）是否形成5连，小优化就是9子之前不需要判断输赢。

## 人机对战

目前我了解到的最靠谱的思路就是： 极大极小值搜索算法 + Alpha-Beta剪枝 + 启发式搜索函数。我也是按这个思路去做的。

人机的代码单独放在名为**machine.js** 的文件里，人机和棋盘的代码是分离的，因为计算量很大，最好是使用web worker，目前我只让它计算2层的深度，能做到很快的反应，所以没把它放到子线程里。

就目前的实现而言，代码的优化远远不足，思考深度到4层，耗时就很长了，我让电脑走的后手，对局势的评分采取相同连子数，黑棋的分比白棋的分多10倍，所以现在的情况就是，电脑会已堵人为主，赢棋为辅，所以有时它已经能取胜了，电脑还会去堵人，然后再取胜。









