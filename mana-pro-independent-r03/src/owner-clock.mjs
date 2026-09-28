import {DURATION,activeRate,isNumber} from './contract.mjs';
/** 切替点まで旧速度で積分してから新速度を設定する。予約/待機は1。 */
export class OwnerClock{
  constructor(motion=null){this.rate=activeRate(motion);this.age=0;this.wall=null;}
  start(wall){if(!isNumber(wall))throw new TypeError('有限monotonic msが必要');if(this.wall===null)this.wall=wall;return this.age;}
  advance(wall){
    if(!isNumber(wall))throw new TypeError('有限monotonic msが必要');
    if(this.wall===null)return this.age;
    if(wall<this.wall)throw new RangeError('時計の巻き戻しは禁止');
    this.age=Math.min(DURATION,this.age+(wall-this.wall)*.001*this.rate);this.wall=wall;return this.age;
  }
  motion(m,wall){this.advance(wall);this.rate=activeRate(m);return this.rate;}
  get phase(){return this.age/DURATION;}
  get done(){return this.age>=DURATION;}
  get started(){return this.wall!==null;}
}
