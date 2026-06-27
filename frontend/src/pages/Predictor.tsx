import { useEffect, useState, useCallback } from "react";
import { getCollections, type Collection } from "../api/collections";

type ShakePosition = "up_down" | "base_rotation" | "rotation_1" | "rotation_2";

type ShakeReport = {
    movement_amount: number;
    loudness: number;
    sound_type: number;
};

type PredictionInput = {
    weight: string;
    shake_reports: Record<ShakePosition, ShakeReport>;
    collection_id: string;
};

type RankedResult = {
    name: string;
    distance: number;
    profile: Record<string, unknown>;
};

type MorphologyProfile = Record<string, unknown>;

const initialShakeReport: ShakeReport = {
    movement_amount: 0,
    loudness: 0,
    sound_type: 0,
};

const shakePositions: { key: ShakePosition; label: string }[] = [
    { key: "up_down", label: "Up / Down" },
    { key: "base_rotation", label: "Base Rotation" },
    { key: "rotation_1", label: "Rotation 1" },
    { key: "rotation_2", label: "Rotation 2" },
];

const morphologyLabels: Record<string, string> = {
    is_symmetrical: "Symmetrical",
    smiski_size: "Size",
    total_prop_number: "Number of Props",
    largest_prop_size: "Largest Prop Size",
    multi_body: "Multi-body",
    elongation_profile: "Elongation",
    compactness: "Compactness",
};

function hasAnyInput(formData: PredictionInput): boolean {
    if (formData.weight !== "") return true;
    for (const pos of Object.values(formData.shake_reports)) {
        if (
            pos.movement_amount !== 0 ||
            pos.loudness !== 0 ||
            pos.sound_type !== 0
        )
            return true;
    }
    return false;
}

function RankedResults({ results }: { results: RankedResult[] }) {
    return (
        <div>
            <h3>Most Likely Smiski</h3>
            {results.map((r, i) => (
                <div key={r.name} style={{ marginBottom: 12 }}>
                    <strong>
                        #{i + 1} {r.name}
                    </strong>
                    <span style={{ marginLeft: 8, color: "#888", fontSize: 14 }}>
                        distance: {r.distance}
                    </span>
                </div>
            ))}
        </div>
    );
}

function MorphologyResult({ profile }: { profile: MorphologyProfile }) {
    return (
        <div>
            <h3>Predicted Morphology</h3>
            {Object.entries(profile).map(([key, val]) => (
                <div key={key} style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 500 }}>
                        {morphologyLabels[key] ?? key}:
                    </span>{" "}
                    <span>{val === null ? "N/A" : String(val)}</span>
                </div>
            ))}
        </div>
    );
}

function Predictor() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [collectionError, setCollectionError] = useState("");
    const [rankedResults, setRankedResults] = useState<RankedResult[] | null>(null);
    const [morphologyResult, setMorphologyResult] = useState<MorphologyProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<PredictionInput>({
        collection_id: "",
        weight: "",
        shake_reports: {
            up_down: { ...initialShakeReport },
            base_rotation: { ...initialShakeReport },
            rotation_1: { ...initialShakeReport },
            rotation_2: { ...initialShakeReport },
        },
    });

    useEffect(() => {
        getCollections()
            .then(setCollections)
            .catch((err: unknown) => {
                if (err instanceof Error) setCollectionError(err.message);
                else setCollectionError("Failed to load collections");
            });
    }, []);

    const fetchPrediction = useCallback(async (data: PredictionInput) => {
        if (!hasAnyInput(data)) {
            setRankedResults(null);
            setMorphologyResult(null);
            return;
        }

        setIsLoading(true);
        try {
            const shake_reports: Record<string, object> = {};
            const positionMap: Record<ShakePosition, string> = {
                up_down: "up_down",
                base_rotation: "base_rotation",
                rotation_1: "rotated_1",
                rotation_2: "rotated_2",
            };

            for (const [key, apiKey] of Object.entries(positionMap)) {
                const pos = data.shake_reports[key as ShakePosition];
                shake_reports[apiKey] = {
                    movement_amount: pos.movement_amount,
                    loudness: pos.loudness,
                    sound_hardness: pos.sound_type,
                };
            }

            const response = await fetch("http://127.0.0.1:8000/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    weight: data.weight !== "" ? parseFloat(data.weight) : null,
                    collection_id: data.collection_id
                        ? parseInt(data.collection_id)
                        : null,
                    shake_reports,
                }),
            });

            const result = await response.json();

            if (data.collection_id) {
                setRankedResults(result.results);
                setMorphologyResult(null);
            } else {
                setMorphologyResult(result.results[0]?.profile ?? null);
                setRankedResults(null);
            }
        } catch (err) {
            console.error("Prediction error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // debounce: wait 500ms after last change before firing
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPrediction(formData);
        }, 500);
        return () => clearTimeout(timer);
    }, [formData, fetchPrediction]);

    function updateCollection(value: string) {
        setFormData((prev) => ({ ...prev, collection_id: value }));
    }

    function updateWeight(value: string) {
        setFormData((prev) => ({ ...prev, weight: value }));
    }

    function updateShakeReport(
        position: ShakePosition,
        field: keyof ShakeReport,
        value: number
    ) {
        setFormData((prev) => ({
            ...prev,
            shake_reports: {
                ...prev.shake_reports,
                [position]: {
                    ...prev.shake_reports[position],
                    [field]: value,
                },
            },
        }));
    }

    return (
        <section className="card">
            <h2>Predict Your Smiski</h2>
            <p>Enter as much information as you can to accurately predict your Smiski.</p>

            <div className="predictor-form">
                <label>
                    Select Collection:
                    <select
                        value={formData.collection_id}
                        onChange={(e) => updateCollection(e.target.value)}
                    >
                        <option value="">Unknown / no collection selected</option>
                        {collections.map((collection) => (
                            <option key={collection.id} value={collection.id}>
                                {collection.name}
                            </option>
                        ))}
                    </select>
                </label>

                {collectionError && <p className="error">{collectionError}</p>}

                <label>
                    Weight:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.weight}
                        onChange={(e) => updateWeight(e.target.value)}
                        placeholder="Enter weight in grams"
                    />
                </label>

                {shakePositions.map((position) => (
                    <fieldset key={position.key} className="shake-section">
                        <legend>{position.label}</legend>

                        <label>
                            Movement amount
                            <select
                                value={formData.shake_reports[position.key].movement_amount}
                                onChange={(e) =>
                                    updateShakeReport(position.key, "movement_amount", Number(e.target.value))
                                }
                            >
                                <option value={0}>0 — none</option>
                                <option value={1}>1 — low</option>
                                <option value={2}>2 — medium</option>
                                <option value={3}>3 — high</option>
                            </select>
                        </label>

                        <label>
                            Loudness
                            <select
                                value={formData.shake_reports[position.key].loudness}
                                onChange={(e) =>
                                    updateShakeReport(position.key, "loudness", Number(e.target.value))
                                }
                            >
                                <option value={0}>0 — none</option>
                                <option value={1}>1 — low</option>
                                <option value={2}>2 — medium</option>
                                <option value={3}>3 — high</option>
                            </select>
                        </label>

                        <label>
                            Sound Hardness
                            <select
                                value={formData.shake_reports[position.key].sound_type}
                                onChange={(e) =>
                                    updateShakeReport(position.key, "sound_type", Number(e.target.value))
                                }
                            >
                                <option value={0}>0 — soft</option>
                                <option value={1}>1 — mixed</option>
                                <option value={2}>2 — hard</option>
                            </select>
                        </label>
                    </fieldset>
                ))}
            </div>

            {isLoading && <p style={{ marginTop: 24 }}>Predicting...</p>}

            {!isLoading && (rankedResults || morphologyResult) && (
                <div className="prediction-result">
                    {rankedResults && <RankedResults results={rankedResults} />}
                    {morphologyResult && <MorphologyResult profile={morphologyResult} />}
                </div>
            )}
        </section>
    );
}

export default Predictor;