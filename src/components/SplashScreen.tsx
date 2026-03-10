interface SplashScreenProps {
  isFirstLaunch: boolean
  onStart: () => void
}

export const SplashScreen = ({
  isFirstLaunch,
  onStart,
}: SplashScreenProps) => (
  <main className="splash-screen">
    <section className="splash-screen__panel splash-screen__panel--mock">
      <div className="splash-screen__bubble splash-screen__bubble--one">☁️</div>
      <div className="splash-screen__bubble splash-screen__bubble--two">⭐</div>
      <div className="splash-screen__bubble splash-screen__bubble--three">🌈</div>
      <div className="splash-screen__bubble splash-screen__bubble--four">🧸</div>
      <div className="splash-screen__sparkle" aria-hidden="true">
        ✨
      </div>
      <p className="splash-screen__caption">Welcome</p>
      <h1>
        BESTIE
        <br />
        POINTS
        <br />
        LOG
      </h1>
      <p>
        Tap in and win stars today.
      </p>

      {isFirstLaunch ? (
        <div className="splash-screen__start">
          <button className="save-button save-button--primary" onClick={onStart} type="button">
            START
          </button>
        </div>
      ) : (
        <div className="splash-screen__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </section>
  </main>
)
