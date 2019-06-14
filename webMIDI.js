
log('MIDI controller detector started.');

function midiMessageReceived( e ) {
  var cmd = e.data[0] >> 4;
  var instrumentNo = e.data[0] & 0xf;
  var channel = e.data[1];
  var velocity = e.data[2];

    var obj = { 
        instrumentNumber: instrumentNo,
        channel: channel,
        velocity: velocity
        
    };

    if(velocity != 0){
        synth.triggerAttack(channelNumberToNote(channel), 0, velocity/128);
    }else{
        synth.triggerRelease(channelNumberToNote(channel));
    }

  logNewEvent("MIDI",obj);
  log(JSON.stringify(obj));

}

let middleC = 440;
let middleCChannel = 48
function channelNumberToNote(channelNo){
  return (channelNo - middleCChannel)
}

function noteToFreq(note){
   return middleC * Math.pow(2, note/12);
}

window.addEventListener('load', function() {
  log('Connecting to controller...');
  if(navigator.requestMIDIAccess !== undefined){
        navigator.requestMIDIAccess().then( gotMIDI, didntGetMIDI );
  }else{
    didntGetMIDI({code: 'Your browser doesn\'t support the webMIDI API.'});
  }
});

class workingPolySynth extends Tone.Instrument{
    constructor(){
        super();
        this.lowSynth = new Tone.Synth().toMaster();
        this.lowSynth.triggerAttack(0,9999,0.000001); //have a low tone so the sound doesn't shut off
        this.synths = [];
        this.playingNotes = []; //note : synthIndex
        this.free = [];
        this.numSynths = 8;
        for(var i=0;i<this.numSynths;i++){
            this.synths.push(new Tone.Synth().toMaster());
            this.free.push(true);
            this.playingNotes.push(null);
            this.synths[i].connect(this.output);
            this.synths[i].triggerAttackRelease(0,0.0001); //this clears em up to be played I guess
        }
    }

    triggerAttack(note, time, velocity){
        for(var i=0;i<this.numSynths;i++){
            if(this.free[i]){
                this.synths[i].triggerAttack(noteToFreq(note),time,velocity);
                this.free[i] = false;   
                this.playingNotes[i] = note;
                break
            }
        }
        this.triadCheck();
    }
    triggerRelease(note){
        for(var i=0;i<this.numSynths;i++){
            if(this.playingNotes[i]  == note){
                this.synths[i].triggerRelease();
                this.free[i] = true;
                this.playingNotes[i] = null;
                return
            }
        }
    }

    triadCheck(){
        console.log(this.playingNotes);
        for(var i=0;i<4;i++){
            let rootNote = this.playingNotes[i];
            if(this.playingNotes.includes(rootNote+4) && this.playingNotes.includes(rootNote+7)){
                log(noteNames[rootNote%12] + " major chord detected!");
            }
            if(this.playingNotes.includes(rootNote+3) && this.playingNotes.includes(rootNote+7)){
                log(noteNames[rootNote%12] + " minor chord detected!");
            }
        }
    }
}
var noteNames = ['c','c#','d','d#','e','f','f#','g','g#','a','a#','b']

var synth = null;
function gotMIDI( midiAccess ) {
  midi = midiAccess;
  synth = new workingPolySynth().toMaster();

  if ((typeof(midiAccess.inputs) == "function")) {  //Old Skool MIDI inputs() code
    var ins = midiAccess.inputs();
    log('All inputs: ', JSON.stringify(ins));
    for (var i=0; i<ins.length; i++)
      ins[i].onmidimessage = midiMessageReceived;
  } else {
    var inputs=midiAccess.inputs.values();
    for ( var input = inputs.next(); input && !input.done; input = inputs.next())
      input.value.onmidimessage = midiMessageReceived;
  }
}

function didntGetMIDI( error ) {
  log("No MIDI access: " + error.code );
}

