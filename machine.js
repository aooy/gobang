(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global)));
}(this, (function (exports) { 
'use strict';


function Machine (option) {
	if(!this.helper.isObject(option)) option = {};
	this.lineNum = 15;
	this.voidChess = {};
	//有效空子距离已下子的步数
	this.disStepNum = typeof option.stepNum === 'number' ? option.stepNum : 1;
	//棋子的标记
	this.Tag = this.helper.isObject(option.Tag) ? option.Tag : {BlACK: 1,WHITE: 2,EMPTY: 0 };

	this.score = {};
	this.score[this.Tag.WHITE] = {
		  ONE: 10,
		  TWO: 100,
		  THREE: 1000,
		  FOUR: 10000,
		  FIVE: 10000000000000,
		  BLOCKED_ONE: 1,
		  BLOCKED_TWO: 10,
		  BLOCKED_THREE: 100,
		  BLOCKED_FOUR: 10000
	}

	this.score[this.Tag.BlACK] = {
		  ONE: 100,
		  TWO: 1000,
		  THREE: 10000,
		  FOUR: 1000000,
		  FIVE: 10000000,
		  BLOCKED_ONE: 10,
		  BLOCKED_TWO: 100,
		  BLOCKED_THREE: 1000,
		  BLOCKED_FOUR: 100000
	}

	this.MAX = this.score[this.Tag.BlACK].FIVE*10;
	this.MIN = -1*this.MAX;

}

Machine.prototype = {
	//辅助函数
	helper: {
		judge: function (o) {
			return Object.prototype.toString.call(o);
		},
		isObject: function (o){
			return this.judge(o) === '[object Object]';
		},
		isboolean: function (b){
			return typeof b === 'boolean';
		}
	},
	//寻找有效空子，棋子相邻的位置算有效
	findvoidChess: function (board) {
		var tem = {},
			res = [];
		for(var i = 1; i < this.lineNum+1; i++){
			//坐标从(1,1)开始
			tem[i] = {};
		}

		for(var x in board){
			for(var y in board[x]){
				//有落子
				if(board[x][y] === this.Tag.BlACK || board[x][y] === this.Tag.WHITE){

					var x = Number(x),
						y = Number(y),
						sx = x - this.disStepNum,
						ex = x + this.disStepNum,
						sy = y - this.disStepNum,
						ey = y + this.disStepNum;
						
						//不能超过边界
					    if(sx < 1) sx = 1;
					    if(ex > this.lineNum) ex = this.lineNum;
					  	if(sy < 1) sy = 1;
					    if(ey > this.lineNum) ey = this.lineNum;

					    for(;sx <= ex; sx++){
					    	for(var i = sy; i <= ey; i++){
					    		//是一个有效空位,并且之前没有记录，则将结果存起来
					    		if(board[sx][i] === undefined && tem[sx][i] === undefined){
					    			tem[sx][i] = this.Tag.EMPTY;
					    			res.push([sx,i]);
					    		}
					    	}
					    }
				}
			}
		}
		//return res.length > 30 ?res.slice(0, 31):res;
		return res;
	},
	//对局势的评分，历遍一个子4个方向,从头到位的整行
	evaluate: function (board, findwhitewin) {
		//存储历遍过的行，避免重复计算
		var across = [],
			WHITE = this.Tag.WHITE,
			BlACK = this.Tag.BlACK,
			EMPTY = this.Tag.EMPTY,
			socStore = {},
			whiteWin = false;

		//初始化两方分数
		socStore[BlACK] = 0;
		socStore[WHITE] = 0;


		for(var x in board){
			for(var y in board[x]){
				if(board[x][y] === BlACK || board[x][y] === WHITE){
					var tag, resSoc, row = [];
					//横
					//横的话是从(1,y)到(15,y),生成一个唯一字符串去标记这行，免得重复计算
					tag = '1' + '-' + y + '-' + this.lineNum + '-' + y;
					if(across.indexOf(tag) === -1){
						across.push(tag);

						for(var i = 1; i <= this.lineNum; i++){
							//将数据塞进一维数组
							if(board[i][y] === undefined){
								row.push(EMPTY);
							}else{
								row.push(board[i][y]);
							}
						}

						//处理此行数据
						resSoc = this.computeRow(row);

						socStore[BlACK] += resSoc[BlACK];
						socStore[WHITE] += resSoc[WHITE];	
					}

					//竖
					//竖行x值不变(x,1) to (x,15)
					tag = x + '-' + '1' + '-' + x + '-' + '15';
					row = [];
					if(across.indexOf(tag) === -1){
						across.push(tag);

						for(var i = 1; i <= this.lineNum; i++){
							//将数据塞进一维数组
							if(board[x][i] === undefined){
								row.push(EMPTY);
							}else{
								row.push(board[x][i]);
							}
						}

						//处理此行数据
						resSoc = this.computeRow(row);

						socStore[BlACK] += resSoc[BlACK];
						socStore[WHITE] += resSoc[WHITE];	
					}

					//反斜
					//计算一下此行的起点和终点
					var s,e,
						x = Number(x),
						y = Number(y);
					if(x === y){
						//起点(1,1) to (15,15)
						s = [1,1];
						e = [this.lineNum, this.lineNum];

					}
					else if(x > y){
						//起点(a,1) to (15,b)
						//计算x与15，y与1的距离
						var disx = this.lineNum - x,
							disy = y -1,
							sum = disx + disy,
							sx = this.lineNum - sum,
							ey = 1 + sum;
							s = [sx, 1],
							e = [this.lineNum, ey];
					}
					else if(y > x){
						//起点(1,a) to (b,15)
						//计算x与15，y与1的距离
						var disx = x - 1,
							disy = this.lineNum - y,
							sum = disx + disy,
							ex = 1 + sum,
							sy = this.lineNum - sum;
							s = [1, sy],
							e = [ex, this.lineNum];	
					}

					row = [];
					tag = s[0]+'-'+s[1]+'-'+e[0]+'-'+e[1];

					if(across.indexOf(tag) === -1){
						across.push(tag);

						for(var i = s[0]; i <= e[0]; i++){
							var ey = i - s[0] + s[1];
							//将数据塞进一维数组
							if(board[i][ey] === undefined){
								row.push(EMPTY);
							}else{
								row.push(board[i][ey]);
							}
						}
						//处理此行数据
						resSoc = this.computeRow(row);

						socStore[BlACK] += resSoc[BlACK];
						socStore[WHITE] += resSoc[WHITE];	
					}

					//正斜
					//计算一下此行的起点和终点
					//正斜的x+y是一个定值，五子棋的正斜中线的和为8
					var mid = this.lineNum + 1; 
						sum = x + y;
					//中线	
					if(sum === mid){
						//（1，15）to (15, 1)
						s = [1, this.lineNum];
						e = [this.lineNum, 1];
					}
					//上半部分
					else if(sum < mid){
						// (1, a) to (a, 1)
						var a = sum - 1;
						s = [1, a];
						e = [a, 1];
					}
					//下半部分
					else if(sum > mid){
						// (a, 15) to (15, a)
						var a = sum - this.lineNum;
						s = [a, this.lineNum];
						e = [this.lineNum, a];
					}

					row = [];
					tag = s[0]+'-'+s[1]+'-'+e[0]+'-'+e[1];

					if(across.indexOf(tag) === -1){
						across.push(tag);

						for(var i = s[0]; i <= s[1]; i++){
							var ey = s[1] - (i - s[0]);
							//将数据塞进一维数组
							if(board[i][ey] === undefined){
								row.push(EMPTY);
							}else{
								row.push(board[i][ey]);
							}
						}
						//处理此行数据
						resSoc = this.computeRow(row);

						socStore[BlACK] += resSoc[BlACK];
						socStore[WHITE] += resSoc[WHITE];	
					}

				}
			}
		}
		if(findwhitewin) {
			if(socStore[WHITE] >= this.score[WHITE].FIVE) return true;
			return false;
		}
		return socStore[WHITE] - socStore[BlACK];
	},
	//处理单行数据
	computeRow: function (row) {
		var	WHITE = this.Tag.WHITE,
			BlACK = this.Tag.BlACK,
			EMPTY = this.Tag.EMPTY,
			SCORE = this.score,
			socStore = {},
			col = [],
			currColor,
			currIndex,
			lBindex,
			rBindex;

		//初始化两方分数
		socStore[BlACK] = 0;
		socStore[WHITE] = 0;

		function changeScore(type) {
			
			switch(col.length){
				case 1:
					if(type == 0) socStore[currColor] += SCORE[currColor].ONE;
					if(type == 1) socStore[currColor] += SCORE[currColor].BLOCKED_ONE;
					break;
				case 2:
					if(type == 0) socStore[currColor] += SCORE[currColor].TWO;
					if(type == 1) socStore[currColor] += SCORE[currColor].BLOCKED_TWO;
					break;
				case 3:
					if(type == 0) socStore[currColor] += SCORE[currColor].THREE;
					if(type == 1) socStore[currColor] += SCORE[currColor].BLOCKED_THREE;
					break;
				case 4:
					if(type == 0) socStore[currColor] += SCORE[currColor].FOUR;
					if(type == 1) socStore[currColor] += SCORE[currColor].BLOCKED_FOUR;
					break;
				case 5:
					socStore[currColor] += SCORE[currColor].FIVE;
					break;	
			}

		};

		row.forEach(function(v, k){
			if(v !== EMPTY){
				//第一次碰到棋子
				if(currColor === undefined){
					currColor = v;
					currIndex = k;
					col.push(v);
					//到最后一个了
					if(k === (row.length-1)){
						lBindex = currIndex - col.length;//左边界的索引，后边肯定是封死的
						if(row[lBindex] === EMPTY){
							changeScore(1)
						}
					}
					return;
				}
			}
			//后边颜色一样
			if(v === currColor){
				currIndex = k;
				col.push(v);
			}else{
				//后边子与前面的不一样
				if(col.length > 0){
					lBindex = currIndex - col.length,//左边界的索引
					rBindex = currIndex + 1;//右边界的索引

					//两头没有被封
					if(row[lBindex] === EMPTY && row[rBindex] === EMPTY){
						changeScore(0)
					}
					//有一头被封
					else if(row[lBindex] === EMPTY ||  row[rBindex] === EMPTY){
						changeScore(1)
					}
					else{
						//两头被堵死的5连
						if(v.length === 5){
							socStore[currColor] += SCORE[currColor].FIVE;
						}
					}
				}

				col = [];
				if(v !== EMPTY){
					currIndex = k;
					currColor = v;
					col.push(v);
				}else{
					currColor = undefined;
				}
				
			}
		})

		return socStore;
	},
	//执行查找
	go: function (board, deep) {
		var voidChess = this.findvoidChess(board),
			WHITE = this.Tag.WHITE,
			BlACK = this.Tag.BlACK,
			gv = this.MIN,
			goods = [],
			mc = this;

		for(var i = 0; i < voidChess.length; i++){

			var c = voidChess[i]; 
			board[c[0]][c[1]] = WHITE; 
			//可以赢了
			if(this.evaluate(board, true)){
				delete board[c[0]][c[1]];
				goods = [c];
				break;
			}
			var v = this.min(board, deep-1, gv > this.MIN ? gv : this.MIN, this.MAX);
			if(v > gv){
				gv = v;
				goods = [];
				goods.push(c);
			}
			delete board[c[0]][c[1]];
		}
		return goods[Math.floor(goods.length * Math.random())];
	},
	//最大最小值搜索
	min: function (board, deep, alpha, beta) {

		if(deep === 0) return this.evaluate(board);

		var voidChess = this.findvoidChess(board),
			gv = this.MAX;

		for(var i = 0; i < voidChess.length; i++){
			var c = voidChess[i];
			board[c[0]][c[1]] = this.Tag.BlACK;
			var v = this.max(board, deep-1, gv < alpha ? gv : alpha, beta);
			delete board[c[0]][c[1]];

			if(v < gv){
				gv = v;
			}
			if(v < alpha) {
				break;
			}
		}
		return gv;
	},
	max: function (board, deep, alpha, beta) {
		if(deep === 0) return this.evaluate(board);

		var voidChess = this.findvoidChess(board),
			gv = this.MIN;

		for(var i = 0; i < voidChess.length; i++){
			var c = voidChess[i];
			board[c[0]][c[1]] = this.Tag.WHITE;
			var v = this.min(board, deep-1, alpha, gv > beta ? gv : beta);
			delete board[c[0]][c[1]];

			if(v > gv){
				gv = v;
			}

			if(v > beta){
				break;
			}
		}	
			
		return gv;
	},
};


	exports.Machine = Machine;
})));
