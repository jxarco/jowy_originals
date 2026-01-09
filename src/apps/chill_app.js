import { LX } from 'lexgui';

class ChillApp
{
    constructor( core )
    {
        this.core = core;
        this.area = new LX.Area( { skipAppend: true, className: 'hidden' } );
        core.area.attach( this.area );

        const panel = new LX.Panel( { height: 'h-full', className: 'relative bg-none border-none p-4 flex flex-col gap-2' } );
        this.area.attach( panel.root );

        this.waves = true;
        this.audio = new Audio( 'data/KATO - Turn The Lights Off (Dany Coast Edit).mp3' );

        this.canvas = LX.makeElement( 'canvas', 'absolute top-0 left-0 w-full opacity-0.5', '', panel );
        const ctx = this.canvas.getContext( '2d' );

        this.audioCtx = new ( window.AudioContext || window.webkitAudioContext )();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;

        const source = this.audioCtx.createMediaElementSource( this.audio );
        source.connect( this.analyser );
        this.analyser.connect( this.audioCtx.destination );
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array( this.bufferLength );

        let t = 0;

        const draw = () => {
            requestAnimationFrame( draw );

            this.analyser.getByteTimeDomainData( this.dataArray );

            if ( !this.waves )
            {
                ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
                return;
            }

            // Fade instead of clear for trails

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );

            ctx.save();
            ctx.translate( 0, this.canvas.height / 2 );

            const sliceWidth = this.canvas.width / this.bufferLength;

            ctx.beginPath();
            ctx.globalAlpha = 0.2;

            for ( let i = 0; i < this.bufferLength; i++ )
            {
                const v = ( this.dataArray[i] - 128 ) / 128;
                const y = v * this.canvas.height * 0.35;

                const x = i * sliceWidth;

                if ( i === 0 ) ctx.moveTo( x, y );
                else ctx.lineTo( x, y );
            }

            const hue = ( t * 40 ) % 360;
            ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
            ctx.lineWidth = 3;
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

            const popPanel = new LX.Panel( { height: 'h-fit', className: '' } );
            popPanel.addRange( 'Volumen', 1, ( v ) => {
                this.audio.volume = v;
            }, { className: 'contrast', min: 0, max: 1, step: 0.01, skipReset: true } );
            popPanel.addToggle( 'Ondas', this.waves, ( v ) => this.waves = v, { className: 'contrast', skipReset: true } );
            popPanel.addSeparator();
            popPanel.addButton( null, 'YA ES VIERNES', () => {
                this.audio.pause();
                this.audio.src = 'data/OutKast -- Hey Ya Lyrics.mp3';
                this.audio.play();
            }, { buttonClass: 'accent' } );

            const optButton = panel.addButton( null, 'OpcionesBtn', () => {
                new LX.Popover( optButton.root, [ popPanel ], { side: 'bottom', align: 'start' } );
            }, { icon: 'Menu', width: 'fit-content', className: 'absolute top-0 mt-6 ml-2 z-1000', xbuttonClass: 'bg-contrast fg-black' } );

            const cont = LX.makeElement( 'div', 'relative h-full', '', panel );

            const img = LX.makeElement( 'img', 'w-full rounded-lg', '', cont );
            img.src = 'data/giphy.gif';
            img.onload = () => {
                this.audio.play();
                this.canvas.style.height = img.offsetHeight + 'px';

                LX.doAsync( () => {
                    this.canvas.width = this.canvas.clientWidth;
                    this.canvas.height = this.canvas.clientHeight;
                }, 50 );
            };
            this.img = img;

            cont.appendChild( this.canvas );

            // Required because AudioContext must be resumed by user gesture
            this.audio.addEventListener( 'play', () => {
                if ( this.audioCtx.state === 'suspended' )
                {
                    this.audioCtx.resume();
                }
                draw();
            } );

            this.audio.addEventListener( 'ended', function() {
                this.currentTime = 0;
                this.play();
            }, false );

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

        if ( this.img )
        {
            // ?
            this.close();

            this.audio.play();
        }
    }

    close()
    {
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    clear()
    {
    }
}

export { ChillApp };
