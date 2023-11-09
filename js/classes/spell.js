class Spell {
    constructor(player, id, name) {
        this.id = id;
        this.timer = 0;
        this.cost = 0;
        this.cooldown = 0;
        this.player = player;
        this.refund = true;
        this.canDodge = true;
        this.totaldmg = 0;
        this.data = [0, 0, 0, 0, 0];
        this.name = name || this.constructor.name;
        this.useonly = false;
        this.maxdelay = 100;
        this.weaponspell = true;
        this.minrage = 0;

        let spell = spells.filter(s => s.id == this.id)[0];
        if (!spell) return;
        if (spell.minrageactive) this.minrage = parseInt(spell.minrage);
        if (spell.maxrageactive) this.maxrage = parseInt(spell.maxrage);
        if (spell.maincdactive) this.maincd = parseInt(spell.maincd) * 1000;
        if (spell.reaction) this.maxdelay = parseInt(spell.reaction);
        if (spell.cooldown) this.cooldown = parseInt(spell.cooldown) || 0;
        if (spell.durationactive) this.cooldown = Math.max(parseInt(spell.duration), this.cooldown);
        if (spell.value1) this.value1 = spell.value1;
        if (spell.value2) this.value2 = spell.value2;
        if (spell.priorityapactive) this.priorityap = parseInt(spell.priorityap);
        if (typeof spell.globals !== 'undefined') this.globals = parseInt(spell.globals);
        if (spell.flagellation) this.flagellation = spell.flagellation;
        if (spell.consumedrage) this.consumedrage = spell.consumedrage;
        if (spell.unqueueactive) this.unqueue = parseInt(spell.unqueue);
        if (spell.exmacro) this.exmacro = spell.exmacro;
        if (spell.execute) this.execute = spell.execute;
    }
    dmg() {
        return 0;
    }
    use() {
        this.player.timer = 1500;
        this.player.rage -= this.cost;
        this.timer = this.cooldown * 1000;
    }
    step(a) {
        if (this.timer <= a) {
            this.timer = 0;
            if (log) this.player.log(`${this.name} off cooldown`);
        }
        else {
            this.timer -= a;
        }
        return this.timer;
    }
    canUse() {
        return !this.timer && !this.player.timer && this.cost <= this.player.rage && this.player.rage >= this.minrage;
    }
}

class Bloodthirst extends Spell {
    constructor(player, id) {
        super(player, id);
        this.cost = 30;
        this.cooldown = 6;
        this.weaponspell = false;
    }
    dmg() {
        return this.player.stats.ap * 0.45;
    }
    canUse() {
        return !this.timer && !this.player.timer && this.cost <= this.player.rage && this.player.rage >= this.minrage;
    }
}

class Whirlwind extends Spell {
    constructor(player, id) {
        super(player, id);
        this.cost = 25;
        this.cooldown = 10;
        this.refund = false;
    }
    dmg() {
        let dmg;
        if (this.player.weaponrng) dmg = rng(this.player.mh.mindmg + this.player.mh.bonusdmg, this.player.mh.maxdmg + this.player.mh.bonusdmg);
        else dmg = avg(this.player.mh.mindmg + this.player.mh.bonusdmg, this.player.mh.maxdmg + this.player.mh.bonusdmg);
        return dmg + (this.player.stats.ap / 14) * this.player.mh.normSpeed;
    }
    canUse() {
        return !this.timer && !this.player.timer && this.cost <= this.player.rage && 
        ((!this.minrage && !this.maincd) ||
         (this.minrage && this.player.rage >= this.minrage) ||
         (this.maincd && (!this.player.spells.bloodthirst || this.player.spells.bloodthirst && this.player.spells.bloodthirst.timer >= this.maincd)) ||
         (this.maincd && (!this.player.spells.mortalstrike || this.player.spells.mortalstrike && this.player.spells.mortalstrike.timer >= this.maincd)));
    }
}

class Overpower extends Spell {
    constructor(player, id) {
        super(player, id);
        this.cost = 5;
        this.cooldown = 5;
        this.canDodge = false;
    }
    dmg() {
        let dmg;
        if (this.player.weaponrng) dmg = this.value1 + rng(this.player.mh.mindmg + this.player.mh.bonusdmg, this.player.mh.maxdmg + this.player.mh.bonusdmg);
        else dmg = this.value1 + avg(this.player.mh.mindmg + this.player.mh.bonusdmg, this.player.mh.maxdmg + this.player.mh.bonusdmg);
        return dmg + (this.player.stats.ap / 14) * this.player.mh.normSpeed;
    }
    use() {
        this.player.timer = 1500;
        this.player.dodgetimer = 0;
        this.timer = this.cooldown * 1000;
        if (this.player.zerkstance) {
            this.player.auras.battlestance.use();
            this.player.rage = Math.min(this.player.rage, this.player.talents.rageretained);
        }
        this.player.rage -= this.cost;
    }
    canUse() {
        return !this.timer && !this.player.timer && this.cost <= this.player.rage && this.player.dodgetimer &&
        ((!this.maxrage && !this.maincd) ||
         (this.maxrage && this.player.rage <= this.maxrage) ||
         (this.maincd && (!this.player.spells.bloodthirst || this.player.spells.bloodthirst && this.player.spells.bloodthirst.timer >= this.maincd)) ||
         (this.maincd && (!this.player.spells.mortalstrike || this.player.spells.mortalstrike && this.player.spells.mortalstrike.timer >= this.maincd)));
    }
}

class Execute extends Spell {
    constructor(player, id) {
        super(player, id);
        this.cost = 15 - player.talents.executecost;
        this.usedrage = 0;
        this.refund = false;
        this.weaponspell = false;
    }
    dmg() {
        return this.value1 + (this.value2 * this.usedrage);
    }
    use(delayedheroic) {
        // HS + Execute macro
        if (delayedheroic && delayedheroic.exmacro && delayedheroic.canUse()) {
            this.player.cast(delayedheroic);
            this.player.heroicdelay = 0;
        }

        this.player.timer = 1500;
        this.player.rage -= this.cost;
        this.usedrage = ~~this.player.rage;
        this.timer = batching - (step % batching);
    }
    step(a) {
        if (this.timer <= a) {
            this.timer = 0;
            if (this.result != RESULT.MISS && this.result != RESULT.DODGE)
                this.player.rage = 0;
            if (log) this.player.log(`Execute batch (${Object.keys(RESULT)[this.result]})`);
        }
        else {
            this.timer -= a;
        }
        return this.timer;
    }
    canUse() {
        return !this.player.timer && this.cost <= this.player.rage;
    }
}

class Bloodrage extends Spell {
    constructor(player, id) {
        super(player, id);
        this.cost = 0;
        this.rage = 10 + player.talents.bloodragebonus;
        this.cooldown = 60;
        this.useonly = true;
    }
    use() {
        this.timer = this.cooldown * 1000;
        let oldRage = this.player.rage;
        this.player.rage = Math.min(this.player.rage + this.rage, 100);
        this.player.auras.bloodrage.use();
        this.player.auras.flagellation && this.player.auras.flagellation.use();
        if (this.player.auras.consumedrage && oldRage <= 80 && this.player.rage > 80)
            this.player.auras.consumedrage.use();
    }
    canUse() {
        return this.timer == 0 && 
            (!this.flagellation || !this.player.auras.bloodrage || !this.player.auras.bloodrage.timer) &&
            (!this.consumedrage || !this.player.auras.consumedrage || this.player.auras.consumedrage.timer);
    }
}

class HeroicStrike extends Spell {
    constructor(player, id) {
        super(player, id, "Heroic Strike");
        this.cost = 15 - player.talents.impheroicstrike;
        this.bonus = player.aqbooks ? 157 : this.value1;
        this.useonly = true;
        this.unqueuetimer = 300;
        this.maxdelay = 300;
    }
    use() {
        this.player.nextswinghs = true;
    }
    canUse() {
        return !this.player.nextswinghs && this.cost <= this.player.rage && 
            ((!this.minrage && !this.maincd) ||
            (this.minrage && this.player.rage >= this.minrage) ||
            (this.maincd && (!this.player.spells.bloodthirst || this.player.spells.bloodthirst && this.player.spells.bloodthirst.timer >= this.maincd)) ||
            (this.maincd && (!this.player.spells.mortalstrike || this.player.spells.mortalstrike && this.player.spells.mortalstrike.timer >= this.maincd)))
            && (!this.unqueue || (this.player.mh.timer > this.unqueuetimer));
    }
}

class MortalStrike extends Spell {
    constructor(player, id) {
        super(player, id, 'Mortal Strike');
        this.cost = 30;
        this.cooldown = 6;
    }
    dmg() {
        let dmg;
        if (this.player.weaponrng) dmg = 160 + rng(this.player.mh.mindmg + this.player.mh.bonusdmg, this.player.mh.maxdmg + this.player.mh.bonusdmg);
        else dmg = 160 + avg(this.player.mh.mindmg + this.player.mh.bonusdmg, this.player.mh.maxdmg + this.player.mh.bonusdmg);
        return dmg + (this.player.stats.ap / 14) * this.player.mh.normSpeed;
    }
    canUse() {
        return !this.timer && !this.player.timer && this.cost <= this.player.rage && this.player.rage >= this.minrage;
    }
}

class SunderArmor extends Spell {
    constructor(player, id) {
        super(player, id, 'Sunder Armor');
        this.cost = 15 - player.talents.impsunderarmor;
        this.stacks = 0;
        this.nocrit = true;
    }
    use() {
        this.player.timer = 1500;
        this.player.rage -= this.cost;
        this.stacks++;
    }
    canUse() {
        return !this.player.timer && this.stacks < this.globals && this.cost <= this.player.rage;
    }
}

class Hamstring extends Spell {
    constructor(player, id) {
        super(player, id);
        this.cost = 10;
        if (player.items.includes(19577)) this.cost -= 2;
    }
    dmg() {
        return this.value1;
    }
}

class VictoryRush extends Spell {
    constructor(player, id) {
        super(player, id, 'Victory Rush');
        this.cost = 0;
        this.stacks = 0;
        this.weaponspell = false;
    }
    use() {
        this.stacks++;
        this.player.timer = 1500;
        this.player.rage -= this.cost;
    }
    dmg() {
        return this.player.stats.ap * 0.45;
    }
    canUse() {
        return !this.player.timer && !this.stacks;
    }
}

class RagingBlow extends Spell {
    constructor(player, id) {
        super(player, id, 'Raging Blow');
        this.cost = 0;
        this.cooldown = 8;
    }
    dmg() {
        let dmg;
        if (this.player.weaponrng) dmg = rng(this.player.mh.mindmg + this.player.mh.bonusdmg, this.player.mh.maxdmg + this.player.mh.bonusdmg);
        else dmg = avg(this.player.mh.mindmg + this.player.mh.bonusdmg, this.player.mh.maxdmg + this.player.mh.bonusdmg);
        return dmg + (this.player.stats.ap / 14) * this.player.mh.normSpeed;
    }
    canUse(executephase) {
        return !this.timer && !this.player.timer && 
            (!executephase || this.execute) &&
            ((this.player.auras.bloodrage && this.player.auras.bloodrage.timer) || (this.player.auras.berserkerrage && this.player.auras.berserkerrage.timer));
    }
}

class BerserkerRage extends Spell {
    constructor(player, id) {
        super(player, id);
        this.cost = 0;
        this.rage = player.talents.berserkerbonus;
        this.cooldown = 30;
        this.useonly = true;
    }
    use() {
        this.player.timer = 1500;
        this.timer = this.cooldown * 1000;
        let oldRage = this.player.rage;
        this.player.rage = Math.min(this.player.rage + this.rage, 100);
        this.player.auras.berserkerrage.use();
        this.player.auras.flagellation && this.player.auras.flagellation.use();
        if (this.player.auras.consumedrage && oldRage <= 80 && this.player.rage > 80)
            this.player.auras.consumedrage.use();
    }
    canUse() {
        return this.timer == 0 && !this.player.timer &&
            (!this.flagellation || !this.player.auras.bloodrage || !this.player.auras.bloodrage.timer) &&
            (!this.consumedrage || !this.player.auras.consumedrage || this.player.auras.consumedrage.timer);
    }
}

class QuickStrike extends Spell {
    constructor(player, id) {
        super(player, id, 'Quick Strike');
        this.cost = 20 - player.talents.impheroicstrike;
        this.cooldown = 0;
    }
    dmg() {
        let dmg;
        if (this.player.weaponrng) dmg = 66;
        else dmg = 66;
        return dmg + (this.player.stats.ap / 14) * this.player.mh.normSpeed;
    }
    canUse() {
        return !this.timer && !this.player.timer && this.cost <= this.player.rage && this.player.rage >= this.minrage;
    }
}

class RagePotion extends Spell {
    constructor(player, id) {
        super(player, id, 'Rage Potion');
        this.cost = 0;
        this.rage = 100;
        this.minrage = 80;
        this.cooldown = 120;
        this.useonly = true;
    }
    use() {
        this.timer = this.cooldown * 1000;
        let oldRage = this.player.rage;
        this.player.rage = Math.min(this.player.rage + ~~rng(this.value1, this.value2), 100);
        if (this.player.auras.consumedrage && oldRage <= 80 && this.player.rage > 80)
            this.player.auras.consumedrage.use();
    }
    canUse() {
        return this.timer == 0 && this.player.rage < this.minrage;
    }
}

/**************************************************** AURAS ****************************************************/

class Aura {
    constructor(player, id, name) {
        this.id = id;
        this.timer = 0;
        this.starttimer = 0;
        this.stats = {};
        this.mult_stats = {};
        this.player = player;
        this.firstuse = true;
        this.duration = 0;
        this.stacks = 0;
        this.uptime = 0;
        this.name = name || this.constructor.name;
        this.maxdelay = 100;
        this.useonly = true;

        let spell = spells.filter(s => s.id == this.id)[0];
        if (!spell) return;
        if (spell.durationactive) this.duration = parseInt(spell.duration);
        if (spell.timetoend) this.timetoend = parseInt(spell.timetoend) * 1000;
        if (spell.crusaders) this.crusaders = parseInt(spell.crusaders);
        if (spell.haste) this.mult_stats = { haste: parseInt(spell.haste) };
        if (spell.value1) this.value1 = spell.value1;
        if (spell.value2) this.value2 = spell.value2;
        if (spell.procblock) this.procblock = spell.procblock;
        if (spell.rageblockactive) this.rageblock = parseInt(spell.rageblock);;

    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateAuras();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateAuras();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
    end() {
        this.uptime += (step - this.starttimer);
        this.timer = 0;
        this.stacks = 0;
    }
}

class Recklessness extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 15;
        this.stats = { crit: 100 };
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.player.timer = 1500;
        this.starttimer = step;
        this.player.updateAuras();
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && step >= this.usestep;
    }
}

class Flurry extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 12;
        this.mult_stats = { haste: player.talents.flurry };
    }
    proc() {
        this.stacks--;
        if (!this.stacks) {
            this.uptime += step - this.starttimer;
            this.timer = 0;
            this.player.updateHaste();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
    use() {
        this.timer = 1;
        if (!this.stacks) {
            this.starttimer = step;
            this.player.updateHaste();
        }
        this.stacks = 3;
        if (log) this.player.log(`${this.name} applied`);
    }
}

class DeepWounds extends Aura {
    constructor(player, id) {
        super(player, id, 'Deep Wounds');
        this.duration = 12;
        this.idmg = 0;
        this.totaldmg = 0;
        this.lasttick = 0;
    }
    step() {
        while (step >= this.nexttick) {
            let min = this.player.mh.mindmg + this.player.mh.bonusdmg + (this.player.stats.ap / 14) * this.player.mh.speed;
            let max = this.player.mh.maxdmg + this.player.mh.bonusdmg + (this.player.stats.ap / 14) * this.player.mh.speed;
            let dmg = (min + max) / 2;
            dmg *= this.player.mh.modifier * this.player.stats.dmgmod * this.player.talents.deepwounds;
            this.idmg += ~~(dmg / 4);
            this.totaldmg += ~~(dmg / 4);

            if (this.player.bleedrage) {
                let oldRage = this.player.rage;
                this.player.rage += this.player.bleedrage;
                if (this.player.rage > 100) this.player.rage = 100;
                if (this.player.auras.consumedrage && oldRage <= 80 && this.player.rage > 80)
                    this.player.auras.consumedrage.use();
            }

            if (log) this.player.log(`${this.name} tick for ${~~(dmg / 4)}`);

            this.nexttick += 3000;
        }

        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
        }
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.nexttick = step + 3000;
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        if (log) this.player.log(`${this.name} applied`);
    }
}

class Crusader extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 15;
        this.stats = { str: 100 };
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateStrength();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.player.updateStrength();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Cloudkeeper extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 30;
        this.stats = { ap: 100 };
    }
    use() {
        this.player.timer = 1500;
        this.player.itemtimer = this.duration * 1000;
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateAuras();
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.player.itemtimer && !this.timer && !this.player.timer;
    }
}

class Felstriker extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 3;
        this.stats = { crit: 100, hit: 100 };
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.update();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.update();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class DeathWish extends Aura {
    constructor(player, id) {
        super(player, id, 'Death Wish');
        this.duration = 30;
        this.mult_stats = { dmgmod: 20 };
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.player.rage -= 10;
        this.player.timer = 1500;
        this.starttimer = step;
        this.player.updateDmgMod();
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && this.player.rage >= 10 && (step >= this.usestep ||
            (this.crusaders == 1 && ((this.player.auras.crusader1 && this.player.auras.crusader1.timer) || (this.player.auras.crusader2 && this.player.auras.crusader2.timer))) ||
            (this.crusaders == 2 && this.player.auras.crusader1 && this.player.auras.crusader1.timer && this.player.auras.crusader2 && this.player.auras.crusader2.timer));
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateDmgMod();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class BattleStance extends Aura {
    constructor(player, id) {
        super(player, id, 'Battle Stance');
        this.duration = 2;
        this.stats = { crit: -3 };
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.player.timer = 1500;
            this.firstuse = false;
            this.player.updateAuras();
            this.player.rage = Math.min(this.player.rage, this.player.talents.rageretained);
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class MightyRagePotion extends Aura {
    constructor(player, id) {
        super(player, id, 'Mighty Rage Potion');
        this.stats = { str: 60 };
        this.duration = 20;
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        let oldRage = this.player.rage;
        this.player.rage = Math.min(this.player.rage + ~~rng(this.value1, this.value2), 100);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateStrength();
        if (this.player.auras.consumedrage && oldRage <= 80 && this.player.rage > 80)
            this.player.auras.consumedrage.use();
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.timer && (step >= this.usestep ||
            (this.crusaders == 1 && ((this.player.auras.crusader1 && this.player.auras.crusader1.timer) || (this.player.auras.crusader2 && this.player.auras.crusader2.timer))) ||
            (this.crusaders == 2 && this.player.auras.crusader1 && this.player.auras.crusader1.timer && this.player.auras.crusader2 && this.player.auras.crusader2.timer));
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateStrength();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class BloodFury extends Aura {
    constructor(player, id) {
        super(player, id, 'Blood Fury');
        this.duration = 15;
        this.mult_stats = { apmod: 25 };
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.timer = 1500;
        this.player.updateAuras();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateAuras();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && step >= this.usestep;
    }
}

class Berserking extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 10;
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.rage -= 5;
        this.player.timer = 1500;
        this.player.updateHaste();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateHaste();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && this.player.rage >= 5 && step >= this.usestep;
    }
}

class Empyrean extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 10;
        this.mult_stats = { haste: 20 };
        this.name = 'Empyrean Haste';
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateHaste();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateHaste();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Eskhandar extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 5;
        this.mult_stats = { haste: 30 };
        this.name = 'Eskhandar Haste';
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateHaste();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateHaste();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Zeal extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 15;
        this.stats = { bonusdmg: 10 };
    }
    use() {
        if (this.player.timer && this.player.timer < 1500) return;
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateBonusDmg();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateBonusDmg();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Annihilator extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 45;
        this.armor = 200;
        this.stacks = 0;
    }
    use() {
        if (rng10k() < this.player.target.binaryresist) return;
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.stacks = this.stacks > 2 ? 3 : this.stacks + 1;
        this.player.updateArmorReduction();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateArmorReduction();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Rivenspike extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 30;
        this.armor = 200;
        this.stacks = 0;
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.stacks = this.stacks > 2 ? 3 : this.stacks + 1;
        this.player.updateArmorReduction();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateArmorReduction();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Bonereaver extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 10;
        this.armor = 700;
        this.stacks = 0;
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.stacks = this.stacks > 2 ? 3 : this.stacks + 1;
        this.player.updateArmorReduction();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateArmorReduction();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Destiny extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 10;
        this.stats = { str: 200 };
    }
}

class Untamed extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 8;
        this.stats = { str: 300 };
        this.name = 'The Untamed Blade';
    }
}

class Pummeler extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 30;
        this.mult_stats = { haste: 50 };
        this.name = 'Manual Crowd Pummeler';
    }
    use() {
        this.player.timer = 1500;
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateHaste();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateHaste();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && !this.player.itemtimer;
    }
}

class Windfury extends Aura {
    constructor(player, id) {
        super(player, id);
        this.stats = { ap: 315 };
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + 1500;
        this.starttimer = step;
        this.mintime = step % batching;
        this.stacks = 2;
        this.player.updateAP();
        this.player.extraattacks++;
        if (log) this.player.log(`${this.name} applied`);
    }
    proc() {
        if (this.stacks < 2) {
            if (step < this.mintime)
                this.timer = this.mintime;
            else
                this.step();
            this.stacks = 0;
        }
        else {
            this.stacks--;
        }
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.stacks = 0;
            this.firstuse = false;
            this.player.updateAP();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Swarmguard extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 30;
        this.armor = 200;
        this.stacks = 0;
        this.chance = 5000;
        this.timetoend = 30000;
    }
    use() {
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.stacks = 0;
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.timer && step >= this.usestep;
    }
    proc() {
        this.stacks = Math.min(this.stacks + 1, 6);
        this.player.updateArmorReduction();
        if (log) this.player.log(`${this.name} proc`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.stacks = 0;
            this.firstuse = false;
            this.player.updateArmorReduction();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Flask extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 60;
        this.stats = { str: 75 };
        this.name = 'Diamond Flask';
    }
    use() {
        this.player.timer = 1500;
        this.player.itemtimer = this.duration * 1000;
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateAuras();
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && !this.player.itemtimer;
    }
}

class Slayer extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 20;
        this.stats = { ap: 260 };
        this.name = 'Slayer\'s Crest';
    }
    use() {
        this.player.timer = 1500;
        this.player.itemtimer = this.duration * 1000;
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateAP();
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && !this.player.itemtimer;
    }
}

class Spider extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 15;
        this.mult_stats = { haste: 20 };
        this.name = 'Kiss of the Spider';
    }
    use() {
        this.player.timer = 1500;
        this.player.itemtimer = this.duration * 1000;
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateHaste();
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && !this.player.itemtimer;
    }
}

class Earthstrike extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 20;
        this.stats = { ap: 280 };
    }
    use() {
        this.player.timer = 1500;
        this.player.itemtimer = this.duration * 1000;
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateAP();
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && !this.player.itemtimer;
    }
}

class Gabbar extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 20;
        this.stats = { ap: 65 };
        this.name = 'Jom Gabbar';
    }
    use() {
        this.stats.ap = 65;
        this.player.timer = 1500;
        this.player.itemtimer = this.duration * 1000;
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateAP();
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && !this.player.itemtimer;
    }
    step() {
        if ((step - this.starttimer) % 2000 == 0) {
            this.stats.ap += 65;
            this.player.updateAP();
            if (log) this.player.log(`${this.name} tick`);
        }
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateAP();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class PrimalBlessing extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 12;
        this.stats = { ap: 300 };
        this.name = 'Primal Blessing';
    }
}

class BloodrageAura extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 10;
        this.name = 'Bloodrage';
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if ((step - this.starttimer) % 1000 == 0) {
            this.player.rage = Math.min(this.player.rage + 1, 100);
            if (this.player.auras.consumedrage && this.player.rage > 80 && this.player.rage <= 81)
                this.player.auras.consumedrage.use();
            if (log) this.player.log(`${this.name} tick`);
        }
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            if (log) this.player.log(`${this.name} removed`);
        }
        return this.timer;
    }
}

class Zandalarian extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 20;
        this.stats = { bonusdmg: 40 };
    }
    use() {
        this.player.timer = 1500;
        this.player.itemtimer = this.duration * 1000;
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.stats.bonusdmg = 40;
        this.player.updateBonusDmg();
        if (log) this.player.log(`${this.name} applied`);
    }
    proc() {
        this.stats.bonusdmg -= 2;
        this.player.updateBonusDmg();
        if (this.stats.bonusdmg <= 0) {
            this.timer = step;
            this.step();
        }
        //this.player.log(`${this.name} proc ${this.stats.bonusdmg} `);
    }
    canUse() {
        return this.firstuse && !this.timer && !this.player.timer && !this.player.itemtimer;
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
            this.player.updateBonusDmg();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class Avenger extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 10;
        this.stats = { ap: 200 };
        this.name = 'Argent Avenger';
    }
}

class Flagellation extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 12;
        this.mult_stats = { dmgmod: 25 };
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.player.updateDmgMod();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.player.updateDmgMod();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class BerserkerRageAura extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = 10;
        this.name = 'Berserker Rage';
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            if (log) this.player.log(`${this.name} removed`);
        }
    }
}

class ConsumedRage extends Aura {
    constructor(player, id) {
        super(player, id, 'Consumed by Rage');
        this.duration = 12;
        this.mult_stats = { dmgmod: 25 };
    }
    proc() {
        this.stacks--;
        if (!this.stacks) {
            this.uptime += step - this.starttimer;
            this.timer = 0;
            this.player.updateDmgMod();
            if (log) this.player.log(`${this.name} removed`);
        }
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.stacks = 12;
        this.player.updateDmgMod();
        if (log) this.player.log(`${this.name} applied`);
    }
    step() {
        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.stacks = 0;
            this.firstuse = false;
            this.player.updateDmgMod();
            if (log) this.player.log(`${this.name} rrremoved`);
        }
    }
}

class Rend extends Aura {
    constructor(player, id) {
        super(player, id);
        this.duration = this.duration || 9;
        this.cost = 10;
        this.idmg = 0;
        this.totaldmg = 0;
        this.lasttick = 0;
        this.dmgmod = 1 + this.player.talents.rendmod / 100;
    }
    step() {
        while (step >= this.nexttick && this.stacks) {
            let dmg = this.value1 * this.player.stats.dmgmod * this.dmgmod;
            this.idmg += ~~(dmg / 3);
            this.totaldmg += ~~(dmg / 3);

            if (this.player.bleedrage) {
                let oldRage = this.player.rage;
                this.player.rage += this.player.bleedrage;
                if (this.player.rage > 100) this.player.rage = 100;
                if (this.player.auras.consumedrage && oldRage <= 80 && this.player.rage > 80)
                    this.player.auras.consumedrage.use();
            }

            if (log) this.player.log(`${this.name} tick for ${~~(dmg / 3)}`);

            this.nexttick += 3000;
            this.stacks--;
        }

        if (step >= this.timer) {
            this.uptime += (this.timer - this.starttimer);
            this.timer = 0;
            this.firstuse = false;
        }
    }
    use() {
        if (this.timer) this.uptime += (step - this.starttimer);
        this.nexttick = step + 3000;
        this.timer = step + this.duration * 1000;
        this.starttimer = step;
        this.stacks = 3;
        if (log) this.player.log(`${this.name} applied`);
    }
    canUse() {
        return !this.timer && !this.player.timer && this.player.rage >= this.cost;
    }
}