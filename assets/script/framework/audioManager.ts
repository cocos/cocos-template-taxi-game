import { _decorator, AudioClip, sys } from "cc";
import { configuration } from "./configuration";
import { resourceUtil } from "./resourceUtil";
import { lodash } from "./lodash";
const { ccclass } = _decorator;

type AudioObj = { clip: AudioClip, loop: boolean, isMusic: boolean };

@ccclass("audioManager")
export class audioManager {
    static _instance: audioManager;

    static get instance () {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new audioManager();
        this._instance.init();
        return this._instance;
    }

    musicVolume: number = 1;
    soundVolume: number = 1;
    audios: { [name: string]: AudioObj} = {};
    arrSound: AudioObj[] = [];

    init () {
        this.musicVolume = this.getConfiguration(true) ? 0.8: 0;
        this.soundVolume = this.getConfiguration(false) ? 1 : 0;
    }

    onAppShow () {
        for (let name in this.audios) {
            let audio = this.audios[name];
            if (audio.loop) {
                //属于无限循环的，则需要在wx环境下自己开启播放
                audio.clip.play();
            }
        }
    }

    getConfiguration (isMusic: boolean) {
        let state;
        if (isMusic) {
            state = configuration.instance.getGlobalData('music');
        } else {
            state = configuration.instance.getGlobalData('sound');
        }

        // console.log('Config for [' + (isMusic ? 'Music' : 'Sound') + '] is ' + state);

        return !state || state === 'true' ? true : false;
    }

    /**
     * 播放音乐
     * @param {String} name 音乐名称可通过constants.AUDIO_MUSIC 获取
     * @param {Boolean} loop 是否循环播放
     */
    playMusic (name:string, loop: boolean) {
        let path = 'gamePackage/audio/music/' + name;
        //微信特殊处理，除一开场的音乐，其余的放在子包里头
        // if (name !== 'click') {
        //     path = 'gamePackage/' + path; //微信特殊处理，除一开场的音乐，其余的放在子包里头
        // }

        resourceUtil.loadRes(path, AudioClip, (err, clip)=> {
            let tmp: AudioObj = { clip, loop, isMusic: true };
            this.audios[name] = tmp;
            this.playClip(name, true);
        });
    }

    /**
     * 播放音效
     * @param {String} name 音效名称可通过constants.AUDIO_SOUND 获取
     * @param {Boolean} loop 是否循环播放
     */
    playSound (name:string, loop = false) {
        if (!this.soundVolume) {
            return;
        }

        //音效一般是多个的，不会只有一个
        let path = 'gamePackage/audio/sound/';
        // if (name !== 'click') {
        //     path = 'gamePackage/' + path; //微信特殊处理，除一开场的音乐，其余的放在子包里头
        // }

        resourceUtil.loadRes(path + name, AudioClip, (err, clip)=> {
            let tmp: AudioObj = { clip, loop, isMusic: false };
            this.arrSound.push(tmp);

            if (loop) {
                this.audios[name] = tmp;
            }

            clip.setVolume(this.soundVolume);
            clip.play();

            clip.once('ended', ()=>{
                lodash.remove(this.arrSound, (obj: AudioObj)=>{
                    return obj.clip === tmp.clip;
                });
            });
        });

    }

    playClip (name: string, isMuisc?: boolean) {
        // console.log('playClip: ' + JSON.stringify(this.audios));
        let audio = this.audios[name];
        // if (typeof audio.audioId === "number") {
        //     let state = cc.audioEngine.getState(audio.audioId);
        //     if (state === cc.audioEngine.AudioState.PLAYING && audio.loop) return;
        // }

        let volume = this.musicVolume;
        if (!isMuisc) {
            volume = this.soundVolume;
        }

        let clip = audio.clip as AudioClip;
        clip.setVolume(volume);
        clip.setLoop(audio.loop);
        clip.play();
        // let audioId = cc.audioEngine.play(audio.clip, audio.loop, volume);
        // audio.audioId = audioId;
    }

    stop (name: string) {
        if (this.audios.hasOwnProperty(name)) {
            let audio = this.audios[name];
            audio.clip.stop();
        }
    }

    setMusic (flag: any) {
        if (typeof flag !== "number") {
            flag = flag ? 1 : 0;
        }

        this.musicVolume = flag as number;
        for (let item in this.audios) {
            if (this.audios.hasOwnProperty(item) && this.audios[item].isMusic) {
                // this.changeState(item, flag);
                let audio = this.audios[item];
                audio.clip.setVolume(this.musicVolume);
            }
        }
    }

    pauseAll () {
        console.log("pause all music!!!");

        for (let item in this.audios) {
            if (this.audios.hasOwnProperty(item)) {
                let audio = this.audios[item];
                audio.clip.pause();
            }
        }
    }

    resumeAll () {
        for (let item in this.audios) {
            if (this.audios.hasOwnProperty(item)) {
                let audio = this.audios[item];
                audio.clip.play();
            }
        }
    }

    openMusic () {
        this.setMusic(0.8);
        configuration.instance.setGlobalData('music', 'true');
    }

    closeMusic () {
        this.setMusic(0);
        configuration.instance.setGlobalData('music', 'false');
    }

    openSound () {
        this.setSound(1);
        configuration.instance.setGlobalData('sound', 'true');
    }

    closeSound () {
        this.setSound(0);
        configuration.instance.setGlobalData('sound', 'false');
    }

    setSound (flag: number) {
        this.soundVolume = flag;
        for (let item in this.audios) {
            if (this.audios.hasOwnProperty(item) && !this.audios[item].isMusic) {
                // this.changeState(item, flag);
                let audio = this.audios[item];
                audio.clip.setVolume(this.soundVolume);
            }
        }

        for (let idx = 0; idx < this.arrSound.length; idx++) {
            let audio = this.arrSound[idx];
            audio.clip.setVolume(this.soundVolume);
        }
    }

    /**
     * 判断声音是否处于播放或初始化中（下载中）的状态
     */
    // isAudioStarting (audioId) {
    //     let ret = false;
    //     if (typeof audioId === 'number') {
    //         let state = audioEngine.getState(audioId);
    //         ret = state === audioEngine.AudioState.PLAYING || state === audioEngine.AudioState.INITIALZING;

    //         // 微信小游戏中cc.audioEngine.getState(audioId)一旦加载就返回2.bug
    //         if (sys.browserType === sys.BROWSER_TYPE_WECHAT_GAME) {
    //             ret = ret || state === audioEngine.AudioState.PAUSED;
    //         }
    //         // console.log('### Audio ' + audioId + ' state is: ' + state);
    //     }

    //     return ret;
    // }

    // setVolume (id: string, volume: number) {
    //     let state = cc.audioEngine.getState(id);
    //     console.log('### audioId ' + id + ' state is: ' + state);

    //     cc.audioEngine.setVolume(id, volume);
    // }

}
