import { useState, useEffect, useRef } from 'react';
import './App.css';

// 面接問題のデータをstate化して外部JSONファイルから読み込む
const defaultQuestions = [];

// 回答例のマッピング
const answers = {
  1: "はじめまして、私はリキンゼンと申します。中国から来ました。2023年6月に太原師範学院の経済学専攻を卒業し、2025年4月より貴大学院の修士課程に進学を希望しております。大学院に入って、経済学専門知識を深めていくだけでなく、自分自身の思考力や問題解決能力などを鍛えて、より一層成長できるように頑張ります。よろしくお願いします。",
  21: "「双減政策」を研究対象に選んだ理由は、教育の負担を減らし、教育の機会を平等にするこの政策が、家庭の教育費や社会の差に大きな影響を与えると考えたからです。特に、教育の有料化が進む中で、家庭の経済状況によって教育の機会が不平等になることに強い関心があります。この政策が教育の平等にどのように影響するのかを明らかにすることは、社会的にもとても重要だと思いますし、私の研究テーマとしても大きな意味があると考えています。",
  61: "双減政策の主な対象となる校外教育機関は、主に学習塾や予備校、オンライン教育プラットフォームなどです。これらの機関は、過度な学習負担を生じさせる恐れがあるため、特に規制の対象となっています。"
};

function App() {
  const [interviewQuestions, setInterviewQuestions] = useState(defaultQuestions);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timer, setTimer] = useState(120); // 2分 = 120秒
  const [isActive, setIsActive] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [selectedDifficulty, setSelectedDifficulty] = useState('すべて');
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customTimerValue, setCustomTimerValue] = useState(120);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 質問データをJSONから読み込む
  useEffect(() => {
    setIsLoading(true);
    fetch('/questions.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('質問データの読み込みに失敗しました');
        }
        return response.json();
      })
      .then(data => {
        setInterviewQuestions(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('質問データの読み込みエラー:', err);
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  // カテゴリを抽出
  useEffect(() => {
    if (interviewQuestions.length > 0) {
      const uniqueCategories = ['すべて', ...new Set(interviewQuestions.map(q => q.category))];
      setCategories(uniqueCategories);
    }
  }, [interviewQuestions]);

  // タイマー処理
  useEffect(() => {
    let interval = null;
    
    if (isActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(timer => timer - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsActive(false);
      if (isRecording) {
        stopRecording();
      }
      // タイマーが0になったときのアラート
      const audioElement = new Audio('/alarm.mp3');
      audioElement.play();
      
      // タイマーが0になったらリセット機能を追加
      setTimer(customTimerValue);
    }
    
    return () => clearInterval(interval);
  }, [isActive, timer, isRecording, customTimerValue]);

  // 録音権限をリクエスト
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (err) {
      console.error('マイクへのアクセスが拒否されました:', err);
      return null;
    }
  };

  // 録音開始
  const startRecording = async () => {
    const stream = await requestMicrophonePermission();
    if (!stream) return;

    audioChunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream);
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (currentQuestion) {
        const newRecording = {
          id: Date.now(),
          questionId: currentQuestion.id,
          question: currentQuestion.question,
          audioUrl,
          timestamp: new Date().toLocaleString()
        };
        
        setRecordings(prev => [...prev, newRecording]);
      }
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  // 録音停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // ストリームを停止
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // ランダムに質問を選択する関数
  const getRandomQuestion = () => {
    let filteredQuestions = interviewQuestions;
    
    if (selectedCategory !== 'すべて') {
      filteredQuestions = filteredQuestions.filter(q => q.category === selectedCategory);
    }
    
    if (selectedDifficulty !== 'すべて') {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === selectedDifficulty);
    }
    
    if (filteredQuestions.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
    return filteredQuestions[randomIndex];
  };

  // 次の質問へ進む
  const nextQuestion = () => {
    // 現在の質問をセッション履歴に追加
    if (currentQuestion) {
      setSessionHistory(prev => [...prev, {
        ...currentQuestion,
        timestamp: new Date().toLocaleString(),
        timeSpent: 120 - timer
      }]);
    }
    
    // 録音中なら停止
    if (isRecording) {
      stopRecording();
    }
    
    const newQuestion = getRandomQuestion();
    setCurrentQuestion(newQuestion);
    setTimer(customTimerValue); // カスタムタイマー値を使用
    setIsActive(true);
    setShowAnswer(false);
  };

  // タイマーのフォーマット
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  // カテゴリ選択の処理
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    // カテゴリが変更されたら質問をリセット
    setCurrentQuestion(null);
    setIsActive(false);
    setShowAnswer(false);
  };

  // 難易度選択の処理
  const handleDifficultyChange = (difficulty) => {
    setSelectedDifficulty(difficulty);
    // 難易度が変更されたら質問をリセット
    setCurrentQuestion(null);
    setIsActive(false);
    setShowAnswer(false);
  };

  // 回答を表示/非表示切り替え
  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  // 履歴表示/非表示切り替え
  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  // 設定表示/非表示切り替え
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // カスタムタイマー設定
  const handleTimerChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setCustomTimerValue(value);
    }
  };

  // 録音操作ボタン
  const renderRecordingButton = () => {
    if (!currentQuestion) return null;
    
    return (
      <button 
        className={`record-button ${isRecording ? 'recording' : ''}`} 
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? '録音停止' : '録音開始'}
      </button>
    );
  };

  return (
    <div className={`app-container ${timer < 30 && isActive ? 'time-warning' : ''}`}>
      <h1>模擬面接トレーニング</h1>
      
      {isLoading ? (
        <div className="loading-container">
          <p>質問データを読み込み中...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>エラーが発生しました: {error}</p>
          <button onClick={() => window.location.reload()}>再読み込み</button>
        </div>
      ) : (
        <>
        <div className="control-panel">
          <button className="control-button" onClick={toggleSettings}>
            設定
          </button>
          <button className="control-button" onClick={toggleHistory}>
            練習履歴
          </button>
        </div>
      
      {showSettings && (
        <div className="settings-panel">
          <h3>設定</h3>
          <div className="setting-group">
            <label>回答時間 (秒):</label>
            <input 
              type="number" 
              value={customTimerValue} 
              onChange={handleTimerChange} 
              min="10" 
              max="300"
            />
          </div>
          
          <div className="setting-group">
            <label>難易度:</label>
            <div className="difficulty-buttons">
              {['すべて', '易', '中', '難'].map(difficulty => (
                <button 
                  key={difficulty} 
                  className={selectedDifficulty === difficulty ? 'active' : ''}
                  onClick={() => handleDifficultyChange(difficulty)}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>
          
          <button className="close-button" onClick={toggleSettings}>閉じる</button>
        </div>
      )}
      
      {showHistory && (
        <div className="history-panel">
          <h3>練習履歴</h3>
          {sessionHistory.length === 0 ? (
            <p>まだ履歴がありません</p>
          ) : (
            <div className="history-list">
              {sessionHistory.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-header">
                    <span className="history-timestamp">{item.timestamp}</span>
                    <span className="history-category">{item.category}</span>
                    <span className="history-difficulty">難易度: {item.difficulty}</span>
                  </div>
                  <div className="history-question">{item.question}</div>
                  <div className="history-time">回答時間: {formatTime(item.timeSpent)}</div>
                </div>
              ))}
            </div>
          )}
          
          <h3>録音一覧</h3>
          {recordings.length === 0 ? (
            <p>まだ録音がありません</p>
          ) : (
            <div className="recordings-list">
              {recordings.map((recording) => (
                <div key={recording.id} className="recording-item">
                  <div className="recording-question">{recording.question}</div>
                  <div className="recording-timestamp">{recording.timestamp}</div>
                  <audio controls src={recording.audioUrl} className="recording-audio" />
                </div>
              ))}
            </div>
          )}
          
          <button className="close-button" onClick={toggleHistory}>閉じる</button>
        </div>
      )}
      
      <div className="category-selector">
        <h3>カテゴリ選択:</h3>
        <div className="category-buttons">
          {categories.map(category => (
            <button 
              key={category} 
              className={selectedCategory === category ? 'active' : ''}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="timer-container">
        <div className={`timer ${timer < 30 ? 'timer-warning' : ''}`}>
          {formatTime(timer)}
        </div>
        <div className="timer-controls">
          {renderRecordingButton()}
          <button className="restart-timer-button" onClick={() => {
            setTimer(customTimerValue);
            setIsActive(true);
          }}>
            タイマー再起動
          </button>
        </div>
      </div>
      
      {currentQuestion ? (
        <div className="question-card">
          <div className="question-header">
            <span className="question-category">{currentQuestion.category}</span>
            <span className="question-id">質問 #{currentQuestion.id}</span>
            <span className="question-difficulty">難易度: {currentQuestion.difficulty}</span>
          </div>
          <div className="question-text">
            {currentQuestion.question}
          </div>
          
          <div className="controls">
            <button onClick={toggleAnswer}>
              {showAnswer ? '回答を隠す' : '回答例を見る'}
            </button>
            <button onClick={nextQuestion}>次の質問</button>
          </div>
          
          {showAnswer && (
            <div className="answer-section">
              <h3>回答例:</h3>
              <p>{answers[currentQuestion.id] || "この質問の回答例はまだ登録されていません。自分の言葉で考えてみましょう。"}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="start-prompt">
          <p>「次の質問」ボタンをクリックして面接を始めましょう</p>
          <button onClick={nextQuestion}>次の質問</button>
        </div>
      )}
      
      <div className="instructions">
        <h3>使い方</h3>
        <ol>
          <li>「次の質問」ボタンをクリックすると、ランダムに質問が表示されます</li>
          <li>表示された質問に対して制限時間内で回答を考えましょう</li>
          <li>録音機能を使って、自分の回答を録音することができます</li>
          <li>必要に応じて「回答例を見る」ボタンをクリックして模範回答を確認できます</li>
          <li>「設定」から回答時間や質問の難易度を変更できます</li>
          <li>「練習履歴」では過去の練習記録や録音を確認できます</li>
        </ol>
      </div>
      </>
      )}
    </div>
  );
}

export default App;