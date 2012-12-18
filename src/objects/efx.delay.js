(function() {
    "use strict";
    
    function EfxDelayNode(_args) {
        timbre.Object.call(this, _args);
        
        this._.delay = new EfxDelay();
        
        this.once("init", oninit);
        
        timbre.fn.fixAR(this);
    }
    timbre.fn.extend(EfxDelayNode, timbre.Object);
    
    var oninit = function() {
        if (!this._.time) {
            this.time = 100;
        }
        if (!this._.feedback) {
            this.feedback = 0.25;
        }
        if (!this._.wet) {
            this.wet = 0.2;
        }
    };
    
    var $ = EfxDelayNode.prototype;
    
    Object.defineProperties($, {
        time: {
            set: function(value) {
                if (typeof value === "number") {
                    if (value > 0 && value < 1500) {
                        this._.time = value;
                        this._.delay.setParams({time:value});
                    }
                }
            },
            get: function() {
                return this._.time;
            }
        },
        feedback: {
            set: function(value) {
                this._.feedback = timbre(value);
            },
            get: function() {
                return this._.feedback;
            }
        },
        wet: {
            set: function(value) {
                this._.wet = timbre(value);
            },
            get: function() {
                return this._.wet;
            }
        }
    });
    
    $.createInnerInstance = function(opts) {
        return new EfxDelay(opts);
    };
    
    $.seq = function(seq_id) {
        var _ = this._;
        var cell = this.cell;

        if (this.seq_id !== seq_id) {

            var changed = false;
            var feedback = _.feedback.seq(seq_id)[0];
            if (_.prevFeedback !== feedback) {
                _.prevFeedback = feedback;
                changed = true;
            }
            var wet = _.wet.seq(seq_id)[0];
            if (_.prevWet !== wet) {
                _.prevWet = wet;
                changed = true;
            }
            if (changed) {
                _.delay.setParams({feedback:feedback, wet:wet});
            }
            
            var inputs = this.inputs;
            var tmp;
            var i, imax;
            var j;
            var mul = _.mul, add = _.add;
            
            for (j = cell.length; j--; ) {
                cell[j] = 0;
            }
            for (i = 0, imax = inputs.length; i < imax; ++i) {
                tmp = inputs[i].seq(seq_id);
                for (j = cell.length; j--; ) {
                    cell[j] += tmp[j];
                }
            }
            
            _.delay.process(cell, true);
            
            for (j = cell.length; j--; ) {
                cell[j] = cell[j] * mul + add;
            }
        }
        
        return cell;
    };
    
    
    function EfxDelay(opts) {
        var bits = Math.ceil(Math.log(timbre.samplerate * 1.5) * Math.LOG2E);
        
        this.cell = new Float32Array(timbre.cellsize);
        
        this.time = 125;
        this.feedback  = 0.25;
        
        this.buffer = new Float32Array(1 << bits);
        this.mask   = (1 << bits) - 1;
        this.wet    = 0.45;
        
        this.readIndex  = 0;
        this.writeIndex = (this.time / 1000 * timbre.samplerate)|0;
        
        if (opts) {
            this.setParams(opts);
        }
    }
    
    EfxDelay.prototype.setParams = function(opts) {
        if (opts.time) {
            this.time = opts.time;
            this.writeIndex = this.readIndex + ((this.time * 0.001 * timbre.samplerate)|0);
        }
        if (opts.feedback) {
            this.feedback = opts.feedback;
        }
        if (opts.wet) {
            this.wet = opts.wet;
        }
        return this;
    };
    
    EfxDelay.prototype.process = function(_cell, overwrite) {
        var cell;
        var buffer, writeIndex, readIndex, feedback;
        var value, wet, dry;
        var i, imax;

        cell   = this.cell;
        buffer = this.buffer;
        writeIndex = this.writeIndex;
        readIndex  = this.readIndex;
        feedback   = this.feedback;
        wet = this.wet;
        dry = 1 - this.wet;
        
        for (i = 0, imax = cell.length; i < imax; ++i) {
            value = buffer[readIndex];
            buffer[writeIndex] = _cell[i] - (value * feedback);
            cell[i] = (_cell[i] * dry) + (value * wet);
            writeIndex += 1;
            readIndex  += 1;
        }

        if (overwrite) {
            while (i--) {
                _cell[i] = cell[i];
            }
        }
        
        this.writeIndex = writeIndex & this.mask;
        this.readIndex  = readIndex  & this.mask;
        
        return cell;
    };
    
    timbre.fn.register("efx.delay", EfxDelayNode);
})();
