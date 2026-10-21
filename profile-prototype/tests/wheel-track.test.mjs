import assert from 'node:assert/strict';import{WheelTrack}from'../src/rhine/wheel-track.ts';
const track=new WheelTrack(12,2);track.input(120,0);track.step(1/60,1/60);assert(track.value>12&&track.value<13);assert.equal(track.target,13);
for(let i=2;i<240;i++)track.step(1/60,i/60);assert.equal(track.value,13);assert(track.idle);
track.input(-120,4);for(let i=1;i<240;i++)track.step(1/60,4+i/60);assert.equal(track.value,12);
const fine=new WheelTrack(12,2);for(let i=0;i<8;i++){fine.input(15,i*.025);fine.step(.025,i*.025);}assert(fine.value>12&&fine.value<13);for(let i=0;i<240;i++)fine.step(1/60,.3+i/60);assert.equal(fine.value,13);
const travel=new WheelTrack(12,2);travel.input(600,0);travel.step(.04,.04);assert(travel.value<13);travel.input(-720,.05);for(let i=1;i<240;i++)travel.step(1/60,.05+i/60);assert.equal(travel.value,11);
console.log('Wheel continuity, small-delta accumulation, snap and mid-motion reversal passed.');
