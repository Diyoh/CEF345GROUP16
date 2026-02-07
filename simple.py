from typing import Dict, List
import json
import os

# town_projects.py
# Small utility to store project names by town using functions.
# Save this as a new file and import its functions where needed.


_store: Dict[str, List[str]] = {}


def _ensure_town(town: str) -> None:
    """Ensure a town key exists in the in-memory store."""
    if town not in _store:
        _store[town] = []


def add_project(town: str, project_name: str) -> bool:
    """
    Add a project name to a town.
    Returns True if added, False if the name already existed.
    """
    _ensure_town(town)
    project_name = project_name.strip()
    if project_name and project_name not in _store[town]:
        _store[town].append(project_name)
        return True
    return False


def remove_project(town: str, project_name: str) -> bool:
    """
    Remove a project name from a town.
    Returns True if removed, False if not found.
    """
    if town not in _store:
        return False
    try:
        _store[town].remove(project_name)
        return True
    except ValueError:
        return False


def list_projects(town: str) -> List[str]:
    """Return a list of projects for a town (copy)."""
    return list(_store.get(town, []))


def find_projects(town: str, query: str) -> List[str]:
    """
    Return project names that contain the query (case-insensitive).
    If town does not exist, returns empty list.
    """
    query = query.lower()
    return [p for p in _store.get(town, []) if query in p.lower()]


def clear_projects(town: str = None) -> None:
    """Clear projects for a town, or clear all towns if town is None."""
    if town is None:
        _store.clear()
    else:
        _store.pop(town, None)


def save_store(filepath: str) -> None:
    """Persist the in-memory store to a JSON file."""
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(_store, f, ensure_ascii=False, indent=2)


def load_store(filepath: str) -> None:
    """Load the store from a JSON file; existing in-memory data will be replaced."""
    global _store
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Guarantee types
        _store = {str(k): list(v) for k, v in data.items()}
    else:
        _store = {}


# Example usage when run directly
if __name__ == "__main__":
    load_store("town_projects.json")
    add_project("Rivertown", "Park redesign")
    add_project("Rivertown", "Community garden")
    add_project("Hillside", "Playground expansion")
    print("Rivertown projects:", list_projects("Rivertown"))
    print("Search 'garden' in Rivertown:", find_projects("Rivertown", "garden"))
    remove_project("Rivertown", "Park redesign")
    save_store("town_projects.json")