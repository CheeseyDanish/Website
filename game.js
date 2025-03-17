let player = {
    level: 1,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    coins: 50,
    xp: 0
};

function updateStats() {
    document.getElementById('level').textContent = player.level;
    document.getElementById('hp').textContent = player.hp;
    document.getElementById('maxHp').textContent = player.maxHp;
    document.getElementById('attack').textContent = player.attack;
    document.getElementById('defense').textContent = player.defense;
    document.getElementById('coins').textContent = player.coins;
}

function log(message) {
    const logDiv = document.getElementById('log');
    logDiv.innerHTML += `<div>${message}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function train() {
    if (player.hp <= 10) {
        log("Your monster is too tired to train!");
        return;
    }
    
    player.hp -= 10;
    player.attack += Math.floor(Math.random() * 3) + 1;
    player.defense += Math.floor(Math.random() * 2) + 1;
    log("Trained hard! ⚡");
    updateStats();
}

function battle() {
    const wildMonster = {
        hp: Math.floor(Math.random() * 30) + 20,
        attack: Math.floor(Math.random() * 15) + 5
    };

    log("Wild monster appeared! 👾");
    
    while(wildMonster.hp > 0 && player.hp > 0) {
        // Player attack
        const damage = Math.max(0, player.attack - Math.floor(Math.random() * 5));
        wildMonster.hp -= damage;
        log(`You hit for ${damage} damage!`);

        // Monster attack
        if(wildMonster.hp > 0) {
            const monsterDamage = Math.max(0, wildMonster.attack - player.defense);
            player.hp -= monsterDamage;
            log(`Monster hits back for ${monsterDamage} damage!`);
        }
    }

    if(player.hp > 0) {
        const reward = Math.floor(Math.random() * 30) + 10;
        player.coins += reward;
        player.xp += 20;
        log(`Victory! Won 💰${reward} and 20XP!`);
        
        if(player.xp >= 100) {
            player.level++;
            player.maxHp += 20;
            player.hp = player.maxHp;
            player.xp = 0;
            log("Level up! ★");
        }
    } else {
        log("You fainted...");
        player.hp = 0;
    }
    
    updateStats();
}

function heal() {
    if(player.coins >= 20) {
        player.coins -= 20;
        player.hp = Math.min(player.hp + 20, player.maxHp);
        log("Healed +20HP!");
        updateStats();
    } else {
        log("Not enough coins!");
    }
}

function buyPotion() {
    if(player.coins >= 20) {
        player.coins -= 20;
        player.hp = Math.min(player.hp + 20, player.maxHp);
        log("Bought potion! +20HP");
        updateStats();
    } else {
        log("Not enough coins!");
    }
}

function buyAttackBoost() {
    if(player.coins >= 30) {
        player.coins -= 30;
        player.attack += 5;
        log("Attack boosted! +5⚔️");
        updateStats();
    } else {
        log("Not enough coins!");
    }
}

// Initialize game
updateStats();
log("Welcome to Monster Tamer! Start training and battling!");
