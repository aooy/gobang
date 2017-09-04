(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global)));
}(this, (function (exports) { 
'use strict';

	function isDef (s) { return s !== undefined; }

	function FiveChess (option) {
		if(!this.helper.isObject(option)) option = {};
		//棋盘的宽度,不能低于32px
		this.width = (isDef(option.width) && Number(option.width) !== NaN && (Number(option.width)>=32)) ? Number(option.width) : 480;
		//外层包裹的div
		this.wrap = document.querySelector(option.containId);
		if(this.wrap === null){
			console.error('必须提供容器元素');
			return;
		}
		this.wrap.style.height = this.wrap.style.width = this.width+'px';
		this.wrap.style.position = 'relative';
		//button
		this.backBtn = document.querySelector(option.backId);
		this.revokeBackBtn = document.querySelector(option.revokeBackId);
		this.restartBtn =  document.querySelector(option.restartId);
		//标准棋盘15*15,计算间距
		this.lineNum = 15;
		this.space = Math.floor(this.width/(this.lineNum + 1));
		//是否使用dom版本
		this.useDom = (isDef(option.useDom) && typeof option.useDom === 'boolean') ? option.useDom : false;
		//初始化一些样式
		if(this.usecav()){
			 //棋盘背景的canvas
			 this.cavbg = document.createElement('canvas')
			 this.cavbgCxt = this.cavbg.getContext("2d"); 
			 //落子的canvas
			 this.cavchess = document.createElement('canvas') 
			 this.cavchessCxt = this.cavchess.getContext("2d");
			 this.cavbg.width = this.cavbg.height = this.cavchess.width = this.cavchess.height = this.space * (this.lineNum + 1) + 1;
			 this.cavbg.classList.add('absolute');
			 this.cavchess.classList.add('absolute');
			 this.cavbg.style.zIndex = 0;
			 this.cavchess.style.zIndex = 10;
			 this.wrap.appendChild(this.cavbg);
			 this.wrap.appendChild(this.cavchess);
		}else {
			//不支持canvas则创建dom棋盘
			this.table = document.createElement('table');
		}	
		//坐标偏移量
		this.offset = 0.5;
		//棋子半径-1提供一些空隙
		this.r = Math.floor(this.space/2) - 1;
		//下一步棋子的颜色,1为黑，2为白
		this.Tag = {
			BlACK: 1,
			WHITE: 2,
			EMPTY: 0 
		};
		this.color = this.Tag.BlACK;
		//白子黑子颜色
		this.bcolor = isDef(option.bcolor) ? option.bcolor:'black';
		this.wcolor = isDef(option.wcolor) ? option.wcolor:'#dbdede';
		//存储棋子的位置数据
		this.allStore = {};
		for(var i = 1; i < this.lineNum+1; i++){
			//坐标从(1,1)开始
			this.allStore[i] = {};
		}
		/**
		  记录每次落子的action,便于回溯,每3个数据为一次action,
		  格式为[color, x, y, color, x, y ....]
		*/
		this.action = [];
		//如果是dom版本的，会把每一步的棋子dom，存进去actionDom
		this.actionDom = [];
		//记录悔了几步棋
		this.backActionNum = 0;
		//棋盘锁定
		this.lock = false;
		//搜索深度
		this.deep = typeof this.deep === 'number' ? option.deep: 2;
		//初始化人机
		this.mac = new Machine({'Tag': this.Tag});
	}
	FiveChess.prototype = {
		//辅助函数
		helper: {
			judge: function (o) {
				return Object.prototype.toString.call(o);
			},
			isObject: function (o){
				return this.judge(o) === '[object Object]';
			},
			//检测是否支持canvas
			supportCav: (function () {
				var cav = document.createElement('canvas');
				return !!cav.getContext;
			})(),
			//是否支持Transforms3d
			supportTransforms3d : (function () {
            	var div = document.createElement('div').style;
	            return ('webkitPerspective' in div || 'MozPerspective' in div || 'OPerspective' in div || 'MsPerspective' in div || 'perspective' in div);
	        })()
		},
		//是否使用canvas
		usecav: function () {
			if(this.helper.supportCav && this.useDom === false){
				return true;
			}else{
				return false;
			}
		},
		//绘制棋盘
		drawBg: function (cxt, width, space) {
			//支持canvas
			if(this.usecav()){
				for (var i = 0; i <= width; i += space) {
				//处理边界模糊
				var pos = i + this.offset;
				//横轴
				this.drawLine(cxt, 0, pos, width, pos);
				//纵轴
				this.drawLine(cxt, pos, 0, pos, width);
				} 
			}else{
				//不支持则用dom
				this.drawTableBg();
			}
		},
		//绘制直线函数
		drawLine: function (cxt, sx, sy, ex, ey) {
			cxt.beginPath(); 
			cxt.moveTo(sx, sy); 
			cxt.lineTo(ex, ey); 
			cxt.closePath(); 
			cxt.stroke(); 
		},
		//绘制dom表格
		drawTableBg: function () {
			var dfg = document.createDocumentFragment();
			this.table.className = 'tab';
			dfg.appendChild(this.table);
			for(var i = 0; i < this.lineNum + 1; i++){
				var tr = document.createElement('tr');
				for(var k = 0; k < this.lineNum + 1; k++){
					var td = document.createElement('td');
					td.style.width = td.style.height = this.space + 'px';
					tr.appendChild(td);
				}
				this.table.appendChild(tr);
			}
			
			this.wrap.appendChild(dfg);
		},
		//检测落子
		checkChess: function (e) {
			//被锁定时不允许落子
			if(this.lock) return;
			//取得棋盘相对视口的偏移量
			var rect = this.usecav()?this.cavbg.getBoundingClientRect():this.table.getBoundingClientRect(),
				chCxt = this.cavchessCxt,
			    top = rect.top,
			    left = rect.left,
			    //计算棋盘的点击位置
			    x = Math.round((e.clientX - left)/this.space),
			    y = Math.round((e.clientY - top)/this.space);
				//检测是否可以落子,边界及边界以外不行，已经落子的也不行
				if(x > this.lineNum || x < 1 || y < 1 || y > this.lineNum || this.allStore[x][y] === this.Tag.BlACK || this.allStore[x][y] === this.Tag.WHITE ){
					return;
				}
				//落子
				this.downChess(chCxt, x, y, this.r, 0, 2*Math.PI, false, this.nextColor()===this.Tag.BlACK?this.bcolor:this.wcolor, false);
		},
		//更新数据
		update: function (x, y, color, isback) {
				if(!this.allStore[x]){
					this.allStore[x] = {};
				}
				//保存action
				if(!isback && this.backActionNum > 0){
					//将悔掉的棋子步数记录删除
					this.action.splice(-3 * this.backActionNum, 3 * this.backActionNum);
					this.backActionNum = 0;
				}
				if(!isback) this.action = this.action.concat([this.nextColor(), x, y]);
				//存进store
				this.allStore[x][y] = color;
				this.color = this.currColor();
				//判断胜负
				if(!isback && !this.whoWin(this.allStore, x, y) && this.nextColor() === this.Tag.WHITE){
					//没有赢则轮到人机思考
					this.machine();
				}
		},
		//落子
		downChess: function (cxt, x, y, r, start, end, anticlockwise, color, isback) {
			var disX = x*this.space + this.offset,
				disY = y*this.space + this.offset;

			if(this.usecav()){
				cxt.beginPath();
				if(typeof color === 'string') cxt.fillStyle = color;
				cxt.arc(disX, disY, r, start, end, anticlockwise);
				cxt.fill();
				cxt.closePath();
			}else{
				var chress = document.createElement('div');
				var elStyle = chress.style;
				this.actionDom.push(chress);
				elStyle.display = 'inline-block';
				elStyle.width = chress.style.height = r * 2 + 'px';
				elStyle.borderRadius = '90px';
				elStyle.backgroundColor = color;
				elStyle.position = 'absolute';
				elStyle.zIndex = '20';
				//dom版本不偏移
				var offsetX = disX - this.offset -(2*r-1)/2;
				var offsetY = disY - this.offset -(2*r-1)/2;
				if (this.helper.supportTransforms3d){
					elStyle.webkitTransform = elStyle.MsTransform = elStyle.msTransform = elStyle.MozTransform = elStyle.OTransform = elStyle.transform = 'translate3d(' + offsetX + 'px, ' + offsetY + 'px, 0px)';
				} else {
					elStyle.left = offsetX + 'px';
					elStyle.top = offsetY + 'px';
				}
				this.wrap.appendChild(chress);
			}

			//更新数据
			this.update(x, y, this.nextColor(), isback);
		},
		//判断输赢
		whoWin: function (store, x, y) {
			//能连成5子，棋盘至少有9颗子，所以9子之前不需要判断输赢
			if( this.action.length/3 < 9 ) return;

			//判断当前最后一子的是否5连  
			var sum = 1, a = x, b = y, color = this.currColor(),
				check = function () {
					if(sum < 5) {
						sum = 1, a = x, b = y;
						return false;
					} else {
						this.sayWinner();
						return true;
					}	
				}.bind(this);
			//有横、竖、正斜、反斜四种赢法
			//1.横
			while(store[a+1] && store[++a][y] === color){
				sum++;
			}
			a = x;
			while(store[a-1] && store[--a][y] === color){
				sum++;
			}
			if(check()) return true;
			//2.竖
			while(store[x][++b] === color){
				sum++;
			}
			b = y;
			while(store[x][--b] === color){
				sum++;
			}
			if(check()) return true;
			//3.正斜
			while(store[a+1] && store[++a][--b] === color){
				sum++;
			}
			a = x, b = y;
			while(store[a-1] && store[--a][++b] === color){
				sum++;
			}
			if(check()) return true;
			//4.反斜
			while(store[a+1] && store[++a][++b] === color){
				sum++;
			}
			a = x, b = y;
			while(store[a-1] && store[--a][--b] === color){
				sum++;
			}
			if(check()) return true;
		},
		sayWinner: function () {
			if(typeof option.winCallback === 'function') option.winCallback(this.currColor());
			this.lock = true;
			return;
		},
		//悔棋
		back: function () {
			if(this.lock || this.action.length === 0 || ( this.backActionNum === this.action.length/3 )) return;
			++this.backActionNum;

			var start = -3*this.backActionNum,
				end = (start+3) === 0 ? undefined : (start+3),
				backAction = this.action.slice(start, end),
				x = backAction[1],
				y = backAction[2],
				color = backAction[0];

			delete this.allStore[x][y];

			//dom版本删除对应dom
			this.color = color;
			this.clearChress(x * this.space - this.r, y * this.space - this.r, this.space, this.space);
		},
		backAttch: function(){
			//棋盘棋子保持偶数
			this.back();
			this.back();
		},
		//撤销悔棋
		revokeBack: function () {
			if(this.backActionNum < 1 || this.lock) return;
			var start = -3*this.backActionNum,
				end = (start + 3) === 0 ? undefined : (start + 3),
				backAction = this.action.slice(start, end),
				x = backAction[1],
				y = backAction[2],
				color = backAction[0];
				
			--this.backActionNum;	
			this.downChess(this.cavchessCxt, x, y, this.r, 0, 2*Math.PI, false, color===this.Tag.BlACK?this.bcolor:this.wcolor, true);
		},
		revokeBackAttch: function () {
			//棋盘棋子保持偶数
			this.revokeBack();
			this.revokeBack();
		},
		//把悔棋抹去
		clearChress: function (x, y, witdh, height) {
			if(this.usecav()){
				this.cavchessCxt.clearRect(x, y, witdh, height);
			}else{
				this.wrap.removeChild(this.actionDom.pop());
			}
		},
		//清理全部棋子
		restart: function () {
			if(this.usecav()){
				var cav = this.cavchess;
				this.cavchessCxt.clearRect(0, 0, cav.offsetWidth, cav.offsetHeight);
			}else{
				var d;
				while(d = this.actionDom.pop()){
					this.wrap.removeChild(d);
				}
			}
			this.recoverState();
		},
		//重置状态
		recoverState: function () {
			this.allStore = {};
			for(var i = 1; i < this.lineNum+1; i++){
				//坐标从(1,1)开始
				this.allStore[i] = {};
			}
			this.action = [];
			this.backActionNum = 0;
			this.actionDom = [];
			this.color = 1;
			this.lock = false;
		},
		//返回最后一个棋子颜色
		currColor: function () {
			return this.color === this.Tag.BlACK?this.Tag.WHITE:this.Tag.BlACK;
		},
		//下一个棋子颜色
		nextColor: function () {
			return this.color;
		},
		//人机
		machine: function () {
			var res = this.mac.go(this.allStore, this.deep);

			this.downChess(this.cavchessCxt, res[0], res[1], this.r, 0, 2*Math.PI, false, this.wcolor);
			
		},
		//初始化函数
		init: function () {
			//绘制棋盘
			this.drawBg(this.cavbgCxt, this.width, this.space);
			//监听落子
	  		document.addEventListener('click', this.checkChess.bind(this));
	  		//悔棋按钮
	  		if(this.backBtn) this.backBtn.addEventListener('click',this.backAttch.bind(this));
	  		//撤销悔棋按钮
	  		if(this.revokeBackBtn) this.revokeBackBtn.addEventListener('click',this.revokeBackAttch.bind(this));
	  		//重新开始按钮
	  		if(this.restartBtn) this.restartBtn.addEventListener('click',this.restart.bind(this));
			
		}
	}
	exports.FiveChess = FiveChess;
})));


	
