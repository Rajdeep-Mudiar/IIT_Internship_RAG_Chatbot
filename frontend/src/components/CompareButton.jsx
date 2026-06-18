import axios from "axios";

function CompareButton({ question, setResults }) {
  const compare = () => {
    axios
      .post(
        "http://127.0.0.1:8000/compare",

        {
          question: question,
        },
      )

      .then((res) => {
        setResults(res.data);
      });
  };

  return <button onClick={compare}>Compare Models</button>;
}

export default CompareButton;
