/**
 * 海洋生态系统模拟
 * 基于Boids算法的完整生态系统
 * 包含：食物链、生长、繁殖、进化和自然选择
 */

class MarineEcosystem {
  constructor() {
    // 核心数据
    this.fishes = []; // 所有鱼类
    this.foods = []; // 所有食物
    this.isRunning = true; // 系统运行状态
    this.lastSpawnTime = 0; // 上次生成时间

    // 统计数据
    this.stats = {
      totalBorn: 0, // 总出生数
      totalDead: 0, // 总死亡数
      predationCount: 0, // 捕食次数
    };

    // 生态系统配置
    this.config = {
      // 基础参数
      maxSpeed: 2.0,
      maxForce: 0.04,
      visualRange: 100,
      separationWeight: 1.5,
      alignmentWeight: 1.0,
      cohesionWeight: 1.0,
      foodAttractionWeight: 2.0,

      // 生存参数
      baseMetabolism: 0.0003, // 基础代谢率
      hungerThreshold: 8, // 饥饿阈值（秒）
      starveThreshold: 30, // 饿死阈值（秒）
      growthRate: 0.15, // 生长率
      minSize: 0.3, // 最小体型
      maxSize: 4.0, // 最大体型

      // 捕食参数
      eatDistance: 20, // 捕食距离
      reproductionChance: 0.015, // 繁殖概率
      reproductionSize: 1.8, // 可繁殖体型

      // 食物参数
      foodLifeSpan: 10000, // 食物寿命（毫秒）
      foodSpawnInterval: 2000, // 食物生成间隔
      foodMoveSpeed: 0.3, // 食物移动速度
    };

    // 鱼类定义
    this.fishSpecies = [
      {
        name: "小丑鱼",
        color: "#FF6B6B",
        baseSize: 20,
        speed: 1.1,
        diet: "herbivore", // 食草
        foodChain: 1,
        canEat: [], // 不能吃其他鱼
      },
      {
        name: "蓝唐鱼",
        color: "#4ECDC4",
        baseSize: 24,
        speed: 1.0,
        diet: "omnivore", // 杂食
        foodChain: 2,
        canEat: [1], // 能吃层级1的鱼
      },
      {
        name: "黄金吊",
        color: "#FFD166",
        baseSize: 28,
        speed: 0.9,
        diet: "carnivore", // 肉食
        foodChain: 3,
        canEat: [1, 2], // 能吃层级1-2的鱼
      },
      {
        name: "紫罗兰",
        color: "#9D4EDD",
        baseSize: 22,
        speed: 1.2,
        diet: "apex", // 顶级掠食
        foodChain: 4,
        canEat: [1, 2, 3], // 能吃所有低层级鱼
      },
    ];

    // DOM元素
    this.container = document.getElementById("oceanContainer");

    // 初始化
    this.init();
  }

  /**
   * 初始化生态系统
   */
  init() {
    this.createInitialFish(15);
    this.bindEvents();
    this.startFoodSpawner();
    this.animate();
  }

  /**
   * 创建初始鱼群
   */
  createInitialFish(count) {
    for (let i = 0; i < count; i++) {
      this.addRandomFish();
    }
  }

  /**
   * 添加随机鱼类
   */
  addRandomFish(x, y) {
    const speciesIndex = Math.floor(Math.random() * this.fishSpecies.length);
    const species = this.fishSpecies[speciesIndex];

    const fish = {
      id: Date.now() + Math.random(),
      x: x || Math.random() * window.innerWidth,
      y: y || Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      species: species,
      speciesIndex: speciesIndex,

      // 生长属性
      size: 1.0 + Math.random() * 0.5, // 随机初始大小
      hunger: Math.random() * 0.5, // 随机初始饥饿度
      lastEatTime: Date.now(),
      health: 1.0,
      isStarving: false,

      // 繁殖属性
      age: 0,
      canReproduce: false,

      // DOM元素
      element: null,
      sizeLabel: null,
    };

    this.createFishElement(fish);
    this.fishes.push(fish);
    this.stats.totalBorn++;
    this.updateStats();
    return fish;
  }

  /**
   * 创建鱼的DOM元素
   */
  createFishElement(fish) {
    const fishEl = document.createElement("div");
    fishEl.className = "fish";
    fishEl.innerHTML = `
            <div class="fish-body">
                <div class="fish-tail"></div>
                <div class="fish-eye"></div>
            </div>
        `;

    this.updateFishAppearance(fish, fishEl);
    this.container.appendChild(fishEl);
    fish.element = fishEl;

    // 创建大小标签
    const sizeLabel = document.createElement("div");
    sizeLabel.className = "size-indicator";
    fishEl.appendChild(sizeLabel);
    fish.sizeLabel = sizeLabel;
  }

  /**
   * 更新鱼的外观
   */
  updateFishAppearance(fish, element = fish.element) {
    if (!element) return;

    const actualSize = fish.species.baseSize * fish.size;
    element.style.width = actualSize + "px";
    element.style.height = actualSize / 2 + "px";
    element.style.color = fish.species.color;
    element.style.backgroundColor = fish.species.color;

    // 更新鱼尾
    const tail = element.querySelector(".fish-tail");
    tail.style.borderColor = `transparent transparent transparent ${fish.species.color}`;
    tail.style.borderWidth = `${actualSize / 4}px 0 ${actualSize / 4}px ${
      actualSize / 2
    }px`;

    // 更新圆角
    element.style.borderRadius = `${actualSize / 2}px ${actualSize / 4}px ${
      actualSize / 4
    }px ${actualSize / 2}px`;

    // 更新大小标签
    if (fish.sizeLabel) {
      fish.sizeLabel.textContent = `x${fish.size.toFixed(1)}`;

      // 根据状态改变标签颜色
      if (fish.health < 0.3) {
        fish.sizeLabel.style.color = "#ff6b6b";
      } else if (fish.isStarving) {
        fish.sizeLabel.style.color = "#ffa726";
      } else {
        fish.sizeLabel.style.color = "rgba(255, 255, 255, 0.9)";
      }
    }

    // 饥饿效果
    element.style.opacity = fish.isStarving ? 0.6 : 1;
  }

  /**
   * 添加食物
   */
  addFood(x, y, isFishFood = false) {
    const food = {
      x: x || Math.random() * window.innerWidth,
      y: y || Math.random() * window.innerHeight,
      createdAt: Date.now(),
      isFishFood: isFishFood,
      nutrition: isFishFood ? 4 : 1, // 鱼食物提供更多营养
      vx: (Math.random() - 0.5) * 0.5, // 随机移动
      vy: (Math.random() - 0.5) * 0.5,
      element: null,
    };

    const foodEl = document.createElement("div");
    foodEl.className = "food";
    foodEl.classList.add(isFishFood ? "food-fish" : "food-regular");

    if (isFishFood) {
      foodEl.style.color = "#ff4444";
    } else {
      const hue = Math.random() * 60 + 40;
      foodEl.style.color = `hsl(${hue}, 100%, 70%)`;
    }

    this.container.appendChild(foodEl);
    food.element = foodEl;
    this.foods.push(food);

    this.updateFoodPosition(food);
  }

  /**
   * 更新食物位置
   */
  updateFoodPosition(food) {
    if (!food.element) return;

    // 边界反弹
    if (food.x < 0 || food.x > window.innerWidth) food.vx = -food.vx;
    if (food.y < 0 || food.y > window.innerHeight) food.vy = -food.vy;

    // 更新位置
    food.x += food.vx;
    food.y += food.vy;

    food.element.style.left = food.x + "px";
    food.element.style.top = food.y + "px";
  }

  /**
   * 清理过期食物
   */
  cleanupFoods() {
    const now = Date.now();
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const food = this.foods[i];

      // 检查是否过期
      if (now - food.createdAt > this.config.foodLifeSpan) {
        this.removeFood(i);
      } else {
        this.updateFoodPosition(food);
      }
    }
  }

  /**
   * 移除食物
   */
  removeFood(index) {
    const food = this.foods[index];
    if (food.element && food.element.parentNode) {
      food.element.style.animation = "fadeOut 0.5s forwards";
      setTimeout(() => {
        if (food.element && food.element.parentNode) {
          food.element.remove();
        }
      }, 500);
    }
    this.foods.splice(index, 1);
  }

  /**
   * 随机生成食物
   */
  spawnRandomFood() {
    if (this.foods.length < 50) {
      // 限制最大食物数量
      this.addFood();
    }
  }

  /**
   * 启动食物生成器
   */
  startFoodSpawner() {
    setInterval(() => {
      if (this.isRunning) {
        this.spawnRandomFood();
      }
    }, this.config.foodSpawnInterval);
  }

  /**
   * 鱼尝试吃食物
   */
  tryEatFood(fish) {
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const food = this.foods[i];
      const dx = food.x - fish.x;
      const dy = food.y - fish.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 检查是否在可吃范围内
      if (distance < this.config.eatDistance * fish.size) {
        this.eatFood(fish, food, i);
        return true;
      }
    }
    return false;
  }

  /**
   * 鱼吃食物
   */
  eatFood(fish, food, foodIndex) {
    // 更新鱼的状态
    fish.lastEatTime = Date.now();
    fish.hunger = 0;
    fish.isStarving = false;

    // 计算生长量
    const growthAmount = food.nutrition * this.config.growthRate;
    fish.size = Math.min(this.config.maxSize, fish.size + growthAmount);

    // 更新外观
    this.updateFishAppearance(fish);

    // 移除食物
    this.removeFood(foodIndex);

    // 吃食物动画
    if (fish.element) {
      fish.element.style.animation = "eatEffect 0.3s ease-in-out";
      setTimeout(() => {
        if (fish.element) {
          fish.element.style.animation = "";
        }
      }, 300);
    }

    // 检查繁殖
    if (
      fish.size >= this.config.reproductionSize &&
      Math.random() < this.config.reproductionChance
    ) {
      this.reproduceFish(fish);
    }
  }

  /**
   * 鱼捕食其他鱼
   */
  tryEatOtherFish(fish) {
    // 只有肉食性和顶级掠食者能捕食
    if (fish.species.diet !== "carnivore" && fish.species.diet !== "apex") {
      return false;
    }

    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const other = this.fishes[i];
      if (other === fish) continue;

      // 检查食物链层级
      if (!fish.species.canEat.includes(other.species.foodChain)) continue;

      // 检查体型差异
      if (other.size >= fish.size) continue;

      // 检查距离
      const dx = other.x - fish.x;
      const dy = other.y - fish.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.config.eatDistance * fish.size) {
        this.eatOtherFish(fish, other, i);
        return true;
      }
    }
    return false;
  }

  /**
   * 鱼吃其他鱼
   */
  eatOtherFish(predator, prey, preyIndex) {
    // 移除被吃的鱼
    if (prey.element && prey.element.parentNode) {
      prey.element.remove();
    }
    this.fishes.splice(preyIndex, 1);

    // 记录统计
    this.stats.totalDead++;
    this.stats.predationCount++;
    this.updateStats();

    // 捕食者生长
    predator.size = Math.min(
      this.config.maxSize,
      predator.size + prey.size * 0.3
    );
    predator.lastEatTime = Date.now();
    predator.isStarving = false;
    this.updateFishAppearance(predator);

    // 生成鱼食物
    this.addFood(prey.x, prey.y, true);

    // 检查繁殖
    if (
      predator.size >= this.config.reproductionSize &&
      Math.random() < this.config.reproductionChance
    ) {
      this.reproduceFish(predator);
    }
  }

  /**
   * 鱼繁殖
   */
  reproduceFish(parent) {
    if (!parent.canReproduce) return;

    for (let i = 0; i < 2; i++) {
      // 每次繁殖生成2条小鱼
      const angle = (Math.PI * 2 * i) / 2;
      const distance = 40;
      const child = this.addRandomFish(
        parent.x + Math.cos(angle) * distance,
        parent.y + Math.sin(angle) * distance
      );

      // 继承父母的部分特性
      child.size = 0.8;
      child.species = parent.species;
      child.speciesIndex = parent.speciesIndex;
      this.updateFishAppearance(child);

      // 设置繁殖冷却
      parent.canReproduce = false;
      setTimeout(() => {
        parent.canReproduce = true;
      }, 10000); // 10秒繁殖冷却
    }
  }

  /**
   * 处理鱼的饥饿
   */
  handleFishHunger(fish, deltaTime) {
    const starveTime = (Date.now() - fish.lastEatTime) / 1000;

    if (starveTime > this.config.hungerThreshold) {
      fish.isStarving = true;
      fish.hunger += 0.001 * deltaTime;

      if (starveTime > this.config.starveThreshold) {
        // 健康度下降
        fish.health = Math.max(0, fish.health - 0.002 * deltaTime);

        // 体型缩小
        fish.size = Math.max(
          this.config.minSize,
          fish.size - this.config.baseMetabolism * deltaTime
        );

        this.updateFishAppearance(fish);

        // 饿死
        if (fish.health <= 0.1) {
          this.killFish(fish, "starvation");
        }
      }
    } else {
      fish.isStarving = false;
    }

    // 更新繁殖能力
    fish.canReproduce = fish.size >= this.config.reproductionSize;
  }

  /**
   * 杀死鱼
   */
  killFish(fish, reason) {
    const index = this.fishes.indexOf(fish);
    if (index !== -1) {
      // 移除元素
      if (fish.element && fish.element.parentNode) {
        fish.element.remove();
      }
      this.fishes.splice(index, 1);

      // 记录统计
      this.stats.totalDead++;
      this.updateStats();

      // 如果是饿死，生成食物
      if (reason === "starvation" && fish.size > 0.5) {
        this.addFood(fish.x, fish.y, true);
      }
    }
  }

  /**
   * 更新鱼的行为（Boids算法）
   */
  updateFishBehavior(fish, deltaTime) {
    // 基础Boids行为
    const sep = this.separation(fish);
    const ali = this.alignment(fish);
    const coh = this.cohesion(fish);
    const bounds = this.checkBounds(fish);

    // 食物吸引力
    let foodForce = { x: 0, y: 0 };
    if (fish.isStarving && this.foods.length > 0) {
      foodForce = this.foodAttraction(fish);
    }

    // 应用所有力
    fish.vx +=
      sep.x * this.config.separationWeight +
      ali.x * this.config.alignmentWeight +
      coh.x * this.config.cohesionWeight +
      foodForce.x +
      bounds.x;

    fish.vy +=
      sep.y * this.config.separationWeight +
      ali.y * this.config.alignmentWeight +
      coh.y * this.config.cohesionWeight +
      foodForce.y +
      bounds.y;

    // 体型影响速度
    const speedMultiplier = 1 / fish.size;
    const maxSpeed = this.config.maxSpeed * speedMultiplier;

    // 限制速度
    const speed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy);
    if (speed > maxSpeed) {
      fish.vx = (fish.vx / speed) * maxSpeed;
      fish.vy = (fish.vy / speed) * maxSpeed;
    }

    // 更新位置
    fish.x += fish.vx;
    fish.y += fish.vy;

    // 更新年龄
    fish.age += deltaTime / 1000;

    // 更新DOM
    this.updateFishElement(fish);
  }

  /**
   * 更新鱼的位置和旋转
   */
  updateFishElement(fish) {
    if (!fish.element) return;

    const angle = (Math.atan2(fish.vy, fish.vx) * 180) / Math.PI;
    fish.element.style.transform = `translate(${fish.x}px, ${fish.y}px) rotate(${angle}deg)`;
    fish.element.style.left = "0";
    fish.element.style.top = "0";
  }

  /**
   * 动画循环
   */
  animate() {
    if (!this.isRunning) {
      requestAnimationFrame(() => this.animate());
      return;
    }

    const now = Date.now();
    const deltaTime = now - (this.lastUpdateTime || now);
    this.lastUpdateTime = now;

    // 更新每条鱼
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i];

      // 尝试进食
      if (!this.tryEatFood(fish) && fish.species.diet !== "herbivore") {
        this.tryEatOtherFish(fish);
      }

      // 处理饥饿
      this.handleFishHunger(fish, deltaTime);

      // 更新行为
      this.updateFishBehavior(fish, deltaTime);

      // 检查自然繁殖
      if (fish.canReproduce && Math.random() < 0.001) {
        this.reproduceFish(fish);
      }
    }

    // 清理食物
    this.cleanupFoods();

    // 更新统计
    this.updateStats();

    // 维持鱼群数量
    if (this.fishes.length < 5) {
      for (let i = 0; i < 3; i++) {
        this.addRandomFish();
      }
    }

    requestAnimationFrame(() => this.animate());
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    // 更新基本信息
    document.getElementById("fishCount").textContent = this.fishes.length;
    document.getElementById("foodCount").textContent = this.foods.length;
    document.getElementById("systemStatus").textContent = this.isRunning
      ? "运行中"
      : "已暂停";

    // 更新平均体型
    if (this.fishes.length > 0) {
      const totalSize = this.fishes.reduce((sum, fish) => sum + fish.size, 0);
      const avgSize = totalSize / this.fishes.length;
      document.getElementById("avgSize").textContent = avgSize.toFixed(1) + "x";
    } else {
      document.getElementById("avgSize").textContent = "0.0x";
    }

    // 更新统计数据
    document.getElementById("totalBorn").textContent = this.stats.totalBorn;
    document.getElementById("totalDead").textContent = this.stats.totalDead;
    document.getElementById("predationCount").textContent =
      this.stats.predationCount;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 点击投食
    document.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON" || !this.isRunning) return;

      // 添加多个食物
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 30;
          this.addFood(
            e.clientX + Math.cos(angle) * distance,
            e.clientY + Math.sin(angle) * distance
          );
        }, i * 50);
      }
    });

    // 添加鱼按钮
    document.getElementById("addFishBtn").addEventListener("click", () => {
      for (let i = 0; i < 3; i++) {
        this.addRandomFish();
      }
    });

    // 批量投食按钮
    document.getElementById("addFoodBtn").addEventListener("click", () => {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          this.addFood();
        }, i * 100);
      }
    });

    // 清理食物按钮
    document.getElementById("clearFoodBtn").addEventListener("click", () => {
      this.foods.forEach((food) => {
        if (food.element && food.element.parentNode) {
          food.element.remove();
        }
      });
      this.foods = [];
      this.updateStats();
    });

    // 暂停/继续按钮
    const pauseBtn = document.getElementById("pauseBtn");
    pauseBtn.addEventListener("click", () => {
      this.isRunning = !this.isRunning;
      pauseBtn.textContent = this.isRunning ? "⏸️ 暂停" : "▶️ 继续";
    });

    // 重置按钮
    document.getElementById("resetBtn").addEventListener("click", () => {
      // 清除所有鱼
      this.fishes.forEach((fish) => {
        if (fish.element && fish.element.parentNode) {
          fish.element.remove();
        }
      });
      this.fishes = [];

      // 清除所有食物
      this.foods.forEach((food) => {
        if (food.element && food.element.parentNode) {
          food.element.remove();
        }
      });
      this.foods = [];

      // 重置统计
      this.stats = { totalBorn: 0, totalDead: 0, predationCount: 0 };

      // 重新初始化
      this.createInitialFish(15);
      this.isRunning = true;
      pauseBtn.textContent = "⏸️ 暂停";
    });

    // 窗口大小调整
    window.addEventListener("resize", () => {
      this.fishes.forEach((fish) => {
        fish.x = Math.max(0, Math.min(fish.x, window.innerWidth));
        fish.y = Math.max(0, Math.min(fish.y, window.innerHeight));
      });
    });
  }

  // Boids算法辅助方法
  separation(fish) {
    let steerX = 0,
      steerY = 0,
      count = 0;
    for (let other of this.fishes) {
      if (other === fish) continue;
      const dx = fish.x - other.x,
        dy = fish.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0 && distance < this.config.visualRange * 0.4) {
        steerX += dx / distance;
        steerY += dy / distance;
        count++;
      }
    }
    if (count > 0) {
      steerX /= count;
      steerY /= count;
      const magnitude = Math.sqrt(steerX * steerX + steerY * steerY);
      if (magnitude > 0) {
        steerX = (steerX / magnitude) * this.config.maxSpeed;
        steerY = (steerY / magnitude) * this.config.maxSpeed;
        steerX -= fish.vx;
        steerY -= fish.vy;
        const steerMag = Math.sqrt(steerX * steerX + steerY * steerY);
        if (steerMag > this.config.maxForce) {
          steerX = (steerX / steerMag) * this.config.maxForce;
          steerY = (steerY / steerMag) * this.config.maxForce;
        }
      }
    }
    return { x: steerX, y: steerY };
  }

  alignment(fish) {
    let avgVx = 0,
      avgVy = 0,
      count = 0;
    for (let other of this.fishes) {
      if (other === fish) continue;
      const dx = fish.x - other.x,
        dy = fish.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0 && distance < this.config.visualRange) {
        avgVx += other.vx;
        avgVy += other.vy;
        count++;
      }
    }
    if (count > 0) {
      avgVx /= count;
      avgVy /= count;
      const magnitude = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
      if (magnitude > 0) {
        avgVx = (avgVx / magnitude) * this.config.maxSpeed;
        avgVy = (avgVy / magnitude) * this.config.maxSpeed;
        avgVx -= fish.vx;
        avgVy -= fish.vy;
        const steerMag = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
        if (steerMag > this.config.maxForce) {
          avgVx = (avgVx / steerMag) * this.config.maxForce;
          avgVy = (avgVy / steerMag) * this.config.maxForce;
        }
      }
    }
    return { x: avgVx, y: avgVy };
  }

  cohesion(fish) {
    let centerX = 0,
      centerY = 0,
      count = 0;
    for (let other of this.fishes) {
      if (other === fish) continue;
      const dx = fish.x - other.x,
        dy = fish.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0 && distance < this.config.visualRange) {
        centerX += other.x;
        centerY += other.y;
        count++;
      }
    }
    if (count > 0) {
      centerX /= count;
      centerY /= count;
      let desiredX = centerX - fish.x,
        desiredY = centerY - fish.y;
      const dist = Math.sqrt(desiredX * desiredX + desiredY * desiredY);
      if (dist > 0) {
        desiredX = (desiredX / dist) * this.config.maxSpeed;
        desiredY = (desiredY / dist) * this.config.maxSpeed;
        desiredX -= fish.vx;
        desiredY -= fish.vy;
        const steerMag = Math.sqrt(desiredX * desiredX + desiredY * desiredY);
        if (steerMag > this.config.maxForce) {
          desiredX = (desiredX / steerMag) * this.config.maxForce;
          desiredY = (desiredY / steerMag) * this.config.maxForce;
        }
      }
      return { x: desiredX, y: desiredY };
    }
    return { x: 0, y: 0 };
  }

  foodAttraction(fish) {
    if (this.foods.length === 0) return { x: 0, y: 0 };
    let closestFood = null,
      closestDist = Infinity;
    for (let food of this.foods) {
      const dx = food.x - fish.x,
        dy = food.y - fish.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < closestDist && distance < 300) {
        closestDist = distance;
        closestFood = food;
      }
    }
    if (!closestFood) return { x: 0, y: 0 };
    let desiredX = closestFood.x - fish.x,
      desiredY = closestFood.y - fish.y;
    const dist = Math.sqrt(desiredX * desiredX + desiredY * desiredY);
    if (dist > 0) {
      const speed = this.config.maxSpeed * Math.min(dist / 100, 1);
      desiredX = (desiredX / dist) * speed;
      desiredY = (desiredY / dist) * speed;
      desiredX -= fish.vx;
      desiredY -= fish.vy;
      const steerMag = Math.sqrt(desiredX * desiredX + desiredY * desiredY);
      if (steerMag > this.config.maxForce * 2) {
        desiredX = (desiredX / steerMag) * this.config.maxForce * 2;
        desiredY = (desiredY / steerMag) * this.config.maxForce * 2;
      }
      return { x: desiredX, y: desiredY };
    }
    return { x: 0, y: 0 };
  }

  checkBounds(fish) {
    const turnForce = this.config.edgeTurnFactor || 0.5;
    let forceX = 0,
      forceY = 0;
    if (fish.x < (this.config.edgeMargin || 50)) forceX = turnForce;
    else if (fish.x > window.innerWidth - (this.config.edgeMargin || 50))
      forceX = -turnForce;
    if (fish.y < (this.config.edgeMargin || 50)) forceY = turnForce;
    else if (fish.y > window.innerHeight - (this.config.edgeMargin || 50))
      forceY = -turnForce;
    return { x: forceX, y: forceY };
  }
}

// 初始化生态系统
window.addEventListener("load", () => {
  new MarineEcosystem();
});
