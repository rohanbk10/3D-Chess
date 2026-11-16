/*************************************************************************
 * 9. MAIN ANIMATION LOOP (IDLE BREATHING, MOVE/ATTACK LUNGE, SHARD PHYSICS)
 *************************************************************************/
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  // 1. Camera Spherical Interpolation
  if (autoOrbit) {
    targetSpherical.theta += dt * 0.28;
  }
  camSpherical.theta += (targetSpherical.theta - camSpherical.theta) * 0.09;
  camSpherical.phi += (targetSpherical.phi - camSpherical.phi) * 0.09;
  camSpherical.radius += (targetSpherical.radius - camSpherical.radius) * 0.09;

  camera.position.x = camSpherical.radius * Math.sin(camSpherical.phi) * Math.sin(camSpherical.theta);
  camera.position.y = camSpherical.radius * Math.cos(camSpherical.phi);
  camera.position.z = camSpherical.radius * Math.sin(camSpherical.phi) * Math.cos(camSpherical.theta);
  camera.lookAt(0, 0.5, 0);

  // 2. Cathedral Floating Sconce Orbs
  floatingOrbs.forEach(orb => {
    orb.position.y = orb.userData.baseY + Math.sin(elapsed * 2.2 + orb.userData.phase) * 0.18;
    orb.rotation.y += dt * 1.1;
  });

  // 3. Piece Custom Idle Animations (Subtle Hovering, Breathing & Crown Rotation)
  Object.values(boardPieces).forEach(pieceRoot => {
    if (activeMoveAnimation && activeMoveAnimation.mover === pieceRoot) return;
    const phase = pieceRoot.userData.phase;
    const body = pieceRoot.userData.body;
    const crown = pieceRoot.userData.floatingCrown;

    // Subtle magical levitation & breathing scale
    const isSelected = pieceRoot.userData.square === selectedSquare;
    const targetHover = isSelected
      ? 0.22 + Math.sin(elapsed * 5.0) * 0.06
      : Math.sin(elapsed * 2.0 + phase) * 0.035 + 0.035;

    body.position.y += (targetHover - body.position.y) * 0.15;

    // Gentle crown bobbing and rotation
    if (crown) {
      crown.position.y = pieceRoot.userData.baseCrownY + Math.sin(elapsed * 2.8 + phase) * 0.045;
      if (pieceRoot.userData.type !== 'n') {
        crown.rotation.y += dt * (isSelected ? 2.4 : 0.55);
      }
    }
  });

  // 4. Active Move, Knight Vault, or Attack Lunge + Shatter Sequence
  if (activeMoveAnimation) {
    const anim = activeMoveAnimation;
    anim.elapsed += dt;
    const rawT = Math.min(anim.elapsed / anim.duration, 1.0);
    // Smooth ease-in-out
    const easeT = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

    if (anim.rookGlide) {
      anim.rookGlide.mesh.position.lerpVectors(anim.rookGlide.from, anim.rookGlide.to, easeT);
      anim.rookGlide.mesh.position.y = Math.sin(rawT * Math.PI) * 0.18;
    }

    if (!anim.isCapture) {
      // Smooth Glide (or high arc leap for Knights)
      anim.mover.position.lerpVectors(anim.startPos, anim.targetPos, easeT);
      const arcHeight = anim.isKnight ? Math.sin(rawT * Math.PI) * 1.65 : Math.sin(rawT * Math.PI) * 0.25;
      anim.mover.position.y = arcHeight;
      anim.mover.userData.body.rotation.x = Math.sin(rawT * Math.PI) * 0.14;
    } else {
      // ATTACK ANIMATION: Wind-up -> High-speed Strike Lunge -> Victim Shatters at t=0.62 -> Settle on square
      const impactT = 0.62;
      if (rawT < impactT) {
        const subT = rawT / impactT;
        const lungeCurve = Math.pow(subT, 2.2);
        const stopShort = anim.targetPos.clone().addScaledVector(anim.dir, -0.35);
        anim.mover.position.lerpVectors(anim.startPos, stopShort, lungeCurve);
        anim.mover.position.y = Math.sin(subT * Math.PI) * 0.75;
        // Aggressive forward strike tilt
        anim.mover.userData.body.rotation.x = Math.sin(subT * Math.PI) * 0.42;
      } else {
        if (!anim.shattered) {
          anim.shattered = true;
          playSound('shatter');
          if (anim.capturedPieceRoot) {
            spawnShatterExplosion(
              anim.capturedPieceRoot.position,
              anim.capturedPieceRoot.userData.color,
              anim.dir
            );
            piecesGroup.remove(anim.capturedPieceRoot);
            disposeObject(anim.capturedPieceRoot);
          }
        }
        const settleT = (rawT - impactT) / (1.0 - impactT);
        const stopShort = anim.targetPos.clone().addScaledVector(anim.dir, -0.35);
        anim.mover.position.lerpVectors(stopShort, anim.targetPos, settleT);
        anim.mover.position.y = (1 - settleT) * 0.15;
        anim.mover.userData.body.rotation.x = (1 - settleT) * 0.2;
      }
    }

    if (rawT >= 1.0) {
      anim.mover.position.copy(anim.targetPos);
      anim.mover.position.y = 0;
      anim.mover.userData.body.rotation.set(0, 0, 0);
      if (anim.rookGlide) anim.rookGlide.mesh.position.copy(anim.rookGlide.to);
      const doneCb = anim.onComplete;
      activeMoveAnimation = null;
      if (doneCb) doneCb();
    }
  }

  // 5. Shattered 3D Stone Shards Physics & Fade-Out
  for (let i = activeFragments.length - 1; i >= 0; i--) {
    const shard = activeFragments[i];
    const data = shard.userData;
    data.age += dt;

    // Gravity & velocity integration
    data.vel.y -= 13.5 * dt;
    shard.position.addScaledVector(data.vel, dt);

    // Bounce off the chessboard surface (y = 0.06)
    if (shard.position.y < 0.07) {
      shard.position.y = 0.07;
      data.vel.y = Math.abs(data.vel.y) * 0.36;
      data.vel.x *= 0.72;
      data.vel.z *= 0.72;
      data.rotVel.multiplyScalar(0.65);
    }

    shard.rotation.x += data.rotVel.x * dt;
    shard.rotation.y += data.rotVel.y * dt;
    shard.rotation.z += data.rotVel.z * dt;

    // Dissolve & shrink in final 35% of life
    const lifeRatio = data.age / data.maxAge;
    if (lifeRatio > 0.65) {
      const fade = 1 - (lifeRatio - 0.65) / 0.35;
      shard.material.opacity = Math.max(0, fade);
      shard.scale.setScalar(Math.max(0.01, fade));
    }

    if (data.age >= data.maxAge) {
      scene.remove(shard);
      shard.geometry.dispose();
      shard.material.dispose();
      activeFragments.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}
