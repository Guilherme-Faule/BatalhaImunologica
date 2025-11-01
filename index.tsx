import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- DATA & TYPES ---

interface CardData {
  nome: string;
  tipo: string;
  texto: string;
  poder: string;
  resistencia: string;
  imageUrl: string;
}

const FASES_IMUNOLOGICAS = [
  {
    conceito: 'Vírus Invasor',
    descricao: 'Uma entidade microscópica ameaçadora que busca se replicar, representando o início da infecção.',
  },
  {
    conceito: 'Macrófago, a Vanguarda',
    descricao: 'Uma célula imune gigante e destemida, a primeira a enfrentar e engolir os invasores.',
  },
  {
    conceito: 'Sinal de Alerta (Citoquinas)',
    descricao: 'Um feitiço de comunicação química, liberado por células imunes para convocar reforços para o campo de batalha.',
  },
  {
    conceito: 'Linfócito T, o General',
    descricao: 'A célula comandante que identifica e ordena a destruição das células do corpo que foram corrompidas pelo inimigo.',
  },
  {
    conceito: 'Linfócito B, a Forja de Armas',
    descricao: 'Uma célula especializada que, após identificar o invasor, se transforma em uma fábrica de armas biológicas precisas.',
  },
  {
    conceito: 'Saraivada de Anticorpos',
    descricao: 'Um feitiço que libera milhões de mísseis teleguiados (anticorpos) que neutralizam os invasores, marcando-os para destruição.',
  },
  {
    conceito: 'Célula de Memória, a Sentinela',
    descricao: 'Uma criatura veterana que sobrevive à batalha, guardando a memória do inimigo para uma resposta muito mais rápida e poderosa no futuro.',
  },
  {
    conceito: 'Vacina, o Treino dos Campeões',
    descricao: 'Um encantamento poderoso que apresenta ao corpo um inimigo enfraquecido ou inativo, permitindo que o exército imunológico treine e crie Células de Memória sem uma batalha real.',
  },
  {
    conceito: 'Resposta Vacinada',
    descricao: 'Uma Célula de Memória aprimorada pelo "treino" da vacina. Ela é mais rápida, mais forte e lidera uma defesa quase impenetrável contra futuras invasões do mesmo inimigo.',
  },
];

const cardSchema = {
    type: Type.OBJECT,
    properties: {
        nome: { type: Type.STRING, description: 'Nome criativo e temático da carta em português.' },
        tipo: { type: Type.STRING, description: 'Tipo da carta (ex: Criatura - Célula, Feitiçaria, Encantamento) em português.' },
        texto: { type: Type.STRING, description: 'Texto de ambientação poético que explica a função da carta no sistema imunológico de forma fantasiosa, em português.' },
        poder: { type: Type.STRING, description: 'Poder de ataque da criatura (um número ou "X"). Se não for criatura, retorne "-".' },
        resistencia: { type: Type.STRING, description: 'Resistência/vida da criatura (um número ou "X"). Se não for criatura, retorne "-".' },
        prompt_imagem: { type: Type.STRING, description: 'Descrição visual detalhada para uma IA gerar uma imagem épica no estilo arte de fantasia sombria (dark fantasy art). Em inglês.' }
    },
    required: ["nome", "tipo", "texto", "poder", "resistencia", "prompt_imagem"]
};

// --- API HELPERS ---

async function generateCardContent(conceito: string, descricao: string): Promise<any> {
    const prompt = `Aja como um designer de jogos de cartas (Magic the Gathering). Crie os detalhes para uma carta que representa o conceito: "${conceito}" - ${descricao}. O tema é uma batalha épica dentro do corpo humano. Gere os dados em português do Brasil.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: cardSchema,
        },
    });
    const parsed = JSON.parse(response.text);
    return parsed;
}

async function generateCardImage(prompt: string): Promise<string> {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `${prompt}, digital fantasy art, epic, detailed, card game illustration`,
        config: {
          numberOfImages: 1,
          aspectRatio: "3:4"
        },
    });
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
}

// --- COMPONENTS ---

const Card = React.memo(({ data }: { data: CardData }) => (
  <div style={styles.card}>
    <div style={styles.cardImageContainer}>
      <img src={data.imageUrl} alt={data.nome} style={styles.cardImage} />
    </div>
    <div style={styles.cardContent}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardName}>{data.nome}</h3>
        <p style={styles.cardType}>{data.tipo}</p>
      </div>
      <div style={styles.cardTextBox}>
        <p style={styles.cardFlavorText}>{data.texto}</p>
      </div>
    </div>
    {data.poder !== '-' && (
      <div style={styles.cardStats}>
        <p>{data.poder}/{data.resistencia}</p>
      </div>
    )}
  </div>
));

const App = () => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const generateStory = useCallback(async () => {
    setIsLoading(true);
    setCards([]);
    setError(null);

    try {
      const generatedCards: CardData[] = [];
      for (let i = 0; i < FASES_IMUNOLOGICAS.length; i++) {
        const fase = FASES_IMUNOLOGICAS[i];
        setLoadingMessage(`Fase ${i + 1}/${FASES_IMUNOLOGICAS.length}: Gerando "${fase.conceito}"...`);
        
        const content = await generateCardContent(fase.conceito, fase.descricao);
        
        setLoadingMessage(`Fase ${i + 1}/${FASES_IMUNOLOGICAS.length}: Ilustrando "${content.nome}"...`);
        const imageUrl = await generateCardImage(content.prompt_imagem);
        
        const newCard: CardData = {
          nome: content.nome,
          tipo: content.tipo,
          texto: content.texto,
          poder: content.poder,
          resistencia: content.resistencia,
          imageUrl: imageUrl,
        };
        
        generatedCards.push(newCard);
        setCards([...generatedCards]);
      }
    } catch (e) {
      console.error(e);
      setError('Ocorreu um erro ao contatar a inteligência biológica. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Batalha Imunológica</h1>
        <p style={styles.subtitle}>O Deck de Defesa do Corpo Humano</p>
      </header>
      <main>
        {!isLoading && cards.length === 0 && (
          <div style={styles.intro}>
            <p>Nosso corpo é um campo de batalha constante. Descubra os heróis desta guerra invisível e como as vacinas preparam nossas defesas para a vitória.</p>
          </div>
        )}

        <div style={styles.controls}>
          <button onClick={generateStory} disabled={isLoading} style={styles.button}>
            {isLoading ? 'Gerando Defesas...' : 'Iniciar Batalha Imunológica'}
          </button>
        </div>

        {isLoading && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>{loadingMessage}</p>
          </div>
        )}
        
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.cardGrid}>
          {cards.map((card, index) => (
            <Card key={index} data={card} />
          ))}
        </div>
      </main>
    </div>
  );
};

// --- STYLES ---

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    textAlign: 'center',
    padding: '1rem',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontFamily: "'Cinzel Decorative', cursive",
    fontSize: '3rem',
    color: 'var(--accent-color)',
    margin: 0,
    textShadow: '2px 2px 4px #000',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: 'var(--text-color)',
    marginTop: '0.5rem',
  },
  intro: {
    maxWidth: '600px',
    margin: '0 auto 2rem auto',
    fontSize: '1.1rem',
    lineHeight: 1.6,
  },
  controls: {
    marginBottom: '2rem',
  },
  button: {
    fontFamily: "'Cinzel Decorative', cursive",
    fontSize: '1.2rem',
    padding: '1rem 2rem',
    backgroundColor: 'var(--card-border)',
    color: 'white',
    border: '2px solid var(--accent-color)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '1.2rem',
  },
  spinner: {
    border: '4px solid rgba(255, 255, 255, 0.2)',
    borderTop: '4px solid var(--accent-color)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '1.1rem',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '2rem',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'var(--card-bg)',
    border: '3px solid var(--card-border)',
    borderRadius: '15px',
    overflow: 'hidden',
    boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    width: '280px',
    margin: '0 auto',
    aspectRatio: '3 / 4.15',
  },
  cardImageContainer: {
    width: '100%',
    paddingTop: '75%', // 4:3 aspect ratio for image area
    position: 'relative',
    borderBottom: '3px solid var(--card-border)',
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardContent: {
    padding: '0.8rem',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    backgroundColor: '#1e1e1e',
    padding: '0.5rem',
    borderRadius: '5px',
    border: '1px solid #444',
    marginBottom: '0.8rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardName: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  cardType: {
    margin: 0,
    fontSize: '0.8rem',
    fontStyle: 'italic',
    opacity: 0.9,
  },
  cardTextBox: {
    backgroundColor: '#1e1e1e',
    padding: '0.8rem',
    borderRadius: '5px',
    border: '1px solid #444',
    flexGrow: 1,
  },
  cardFlavorText: {
    margin: 0,
    fontSize: '0.9rem',
    fontStyle: 'italic',
    lineHeight: 1.4,
    color: '#ccc'
  },
  cardStats: {
    alignSelf: 'flex-end',
    margin: '0.8rem',
    backgroundColor: 'var(--card-border)',
    color: 'black',
    fontWeight: 'bold',
    padding: '0.3rem 0.7rem',
    borderRadius: '10px',
    border: '2px solid black'
  },
};

// Add keyframes for spinner animation
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  button:disabled {
    cursor: not-allowed;
    background-color: #555;
    border-color: #777;
    opacity: 0.6;
  }
  button:not(:disabled):hover {
    background-color: var(--accent-color);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.5);
  }
`;
document.head.appendChild(styleSheet);


// --- RENDER APP ---

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
