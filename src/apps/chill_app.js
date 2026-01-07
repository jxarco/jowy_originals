import { LX } from 'lexgui';

class ChillApp
{
    constructor( core )
    {
        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        core.area.attach( this.area );

        const panel = new LX.Panel( { height: 'h-full', className: 'bg-none border-none p-4 flex flex-col gap-2' } );
        this.area.attach( panel.root );

        this.audio = new Audio( 'data/KATO - Turn The Lights Off (Dany Coast Edit).mp3' );

        this.canvas = LX.makeElement( 'canvas', 'absolute top-0 left-0 w-full opacity-0.5', '', panel );
        const ctx = this.canvas.getContext( '2d' );

        const audioCtx = new ( window.AudioContext || window.webkitAudioContext )();
        const source = audioCtx.createMediaElementSource( this.audio );
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        source.connect( analyser );
        analyser.connect( audioCtx.destination );

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array( bufferLength );

        let t = 0;

        const draw = () => {
            // requestAnimationFrame(draw);

            // console.log("wqefewf")

            // analyser.getByteFrequencyData(dataArray);

            // ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // const barWidth = this.canvas.width / bufferLength;

            // for (let i = 0; i < bufferLength; i++) {
            //     const value = dataArray[i];
            //     const barHeight = (value / 255) * this.canvas.height;

            //     ctx.fillStyle = `rgb(${value}, 240, 100)`;
            //     ctx.fillRect(
            //         i * barWidth,
            //         this.canvas.height - barHeight,
            //         barWidth - 1,
            //         barHeight
            //     );
            // }

            requestAnimationFrame( draw );

            analyser.getByteTimeDomainData( dataArray );

            // Fade instead of clear for trails
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );

            ctx.save();
            ctx.translate( 0, this.canvas.height / 2 );

            const sliceWidth = this.canvas.width / bufferLength;

            ctx.beginPath();

            for ( let i = 0; i < bufferLength; i++ )
            {
                const v = ( dataArray[i] - 128 ) / 128;
                const y = v * this.canvas.height * 0.35;

                const x = i * sliceWidth;

                if ( i === 0 ) ctx.moveTo( x, y );
                else ctx.lineTo( x, y );
            }

            const hue = ( t * 40 ) % 360;
            ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 20;
            ctx.shadowColor = `hsla(${hue}, 100%, 60%, 1)`;

            ctx.stroke();

            // Mirror
            ctx.scale( 1, -1 );
            ctx.stroke();

            ctx.restore();

            t += 0.01;
        };

        panel.addButton( null, 'Click here', ( v ) => {
            panel.clear();

            panel.addRange( 'Volumen', 1, ( v ) => {
                this.audio.volume = v;
            }, { className: 'accent', min: 0, max: 1, step: 0.01 } );

            const cont = LX.makeElement( 'div', 'relative h-full', '', panel );

            const img = LX.makeElement( 'img', 'w-full', '', cont );
            img.src = 'data/giphy.gif';
            img.onload = () => {
                this.audio.play();
                this.canvas.style.height = img.offsetHeight + 'px';

                LX.doAsync( () => {
                    this.canvas.width = this.canvas.clientWidth;
                    this.canvas.height = this.canvas.clientHeight;
                }, 50 );
            };

            cont.appendChild( this.canvas );

            // Required because AudioContext must be resumed by user gesture
            this.audio.addEventListener( 'play', () => {
                if ( audioCtx.state === 'suspended' )
                {
                    audioCtx.resume();
                }
                draw();
            } );

            this.audio.play();
        }, { className: 'block z-100 contrast self-center', width: 'fit-content' } );

        core.chillAppArea = this.area;

        this.clear();
    }

    open( params )
    {
        this.core.tool = 'chill';
        this.core.setHeaderTitle( `Time to Chill :)`, '', 'Panda' );
        this.area.root.classList.toggle( 'hidden', false );
    }

    clear()
    {
    }
}

export { ChillApp };
